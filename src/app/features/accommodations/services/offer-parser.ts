// Turns the /erp/availability response into a flat list of priced offers
// (one per room x meal plan x promotion). Shared by the accommodation quote form and the B2B module.
export function parseOffers(offers: any[]): any[] {
  const results: any[] = [];
  if (!offers || offers.length === 0) return results;
  const hotelData = offers[0]; // The API returns an array containing the hotel object

  if (hotelData.availableRooms) {
    hotelData.availableRooms.forEach((room: any) => {
      // --- 1. Process Regular Prices (No Promotion) ---
      if (room.regularRoomPricesPerDays && room.mealPlans) {
        // Sum up the base room price across all days
        const baseRoomPrice = room.regularRoomPricesPerDays.reduce(
          (sum: number, day: any) => sum + day.price,
          0,
        );

        room.mealPlans.forEach((plan: any) => {
          // Sum up the meal plan price across all days (safeguard in case mealRates is missing)
          const baseMealPrice = plan.mealRates
            ? plan.mealRates.reduce((sum: number, day: any) => sum + day.pricePerDay, 0)
            : 0;

          // Quoted prices are rounded up to whole units
          const grandTotal = Math.ceil(baseRoomPrice + baseMealPrice);

          results.push({
            roomCandidateId: room.roomCandidateId,
            roomId: room.roomId,
            roomName: room.roomName,
            mealPlan: plan.name,
            promotion: 'None',
            price: grandTotal,
            isDiscounted: false,
            breakdown: createBreakdown(
              room.regularRoomPricesPerDays,
              plan.mealRates,
              undefined,
              plan.name,
            ),
          });
        });
      }

      // --- 2. Process Promotional Prices ---
      if (room.pricesPerDaysWithPromotion && room.pricesPerDaysWithPromotion.length > 0) {
        room.pricesPerDaysWithPromotion.forEach((promoPricing: any) => {
          // Calculate the discounted room total
          const discountedRoomPrice = promoPricing.roomPricesPerDays
            ? promoPricing.roomPricesPerDays.reduce((sum: number, day: any) => sum + day.price, 0)
            : 0;

          // Loop through the array of promotional meal plans
          if (
            promoPricing.mealPlansWithPricesPerDays &&
            promoPricing.mealPlansWithPricesPerDays.length > 0
          ) {
            promoPricing.mealPlansWithPricesPerDays.forEach((promoPlan: any) => {
              // Sum up the meal plan price across all days for this specific plan
              const mealPrice = promoPlan.mealPlanPricesPerDays
                ? promoPlan.mealPlanPricesPerDays.reduce(
                    (sum: number, day: any) => sum + day.pricePerDay,
                    0,
                  )
                : 0;

              const grandTotal = Math.ceil(discountedRoomPrice + mealPrice);

              // The promotion details now live on the pricing entry itself.
              // Prefer the "full" fields, which reflect combined promotions
              // (e.g. "Long Stay Offer + Early Bird Offer" at "discount: 19%").
              const promo = promoPricing.promotion;
              const fullDiscountText = promoPricing.promotionFullDiscountAndFlatRate as
                | string
                | undefined;
              const parsedDiscount = fullDiscountText
                ? Number((fullDiscountText.match(/(\d+(?:\.\d+)?)\s*%/) || [])[1])
                : NaN;
              const discount = !Number.isNaN(parsedDiscount)
                ? parsedDiscount
                : (promo?.periods?.[0]?.discount ?? null);

              results.push({
                roomCandidateId: room.roomCandidateId,
                roomId: room.roomId,
                roomName: room.roomName,
                mealPlan: promoPlan.name, // The JSON provides the meal plan name here
                promotion:
                  promoPricing.promotionFullName || promo?.name || 'Promotional Offer',
                promotionType: promo?.type ?? null,
                description: promo?.description ?? null,
                discount: discount,
                price: grandTotal,
                isDiscounted: true,
                // Discount text ("discount: 19%")
                discountText:
                  discount != null
                    ? `${discount}%`
                    : fullDiscountText || 'Discount Applied',
                breakdown: createBreakdown(
                  promoPricing.roomPricesPerDays,
                  promoPlan.mealPlanPricesPerDays,
                  room.regularRoomPricesPerDays,
                  promoPlan.name,
                ),
              });
            });
          }
        });
      }
    });
  }

  return results;
}

function createBreakdown(
  roomPrices: any[],
  mealPrices?: any[],
  originalRoomPrices?: any[],
  mealPlanName?: string,
) {
  if (!roomPrices) return [];

  return roomPrices.map((rp, index) => {
    const mealPrice = mealPrices ? mealPrices[index] : null;
    const original = originalRoomPrices ? originalRoomPrices[index] : null;
    const mealPerDay = mealPrice ? mealPrice.pricePerDay : 0;

    return {
      date: rp.date,
      // Falls back to the room price itself when there is no discount
      originalRoomPrice: original ? original.price : rp.price,
      roomPrice: rp.price,
      roomFormula: rp.formula,
      mealPlanName: mealPlanName ?? null,
      mealPrice: mealPerDay,
      total: rp.price + mealPerDay,
    };
  });
}
