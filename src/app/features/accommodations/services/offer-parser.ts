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

        const mandatory = normalizeMandatory(room.mandatoryMealPlans);
        const mandatoryTotal = sumMandatory(mandatory);

        room.mealPlans.forEach((plan: any) => {
          // Sum up the meal plan price across all days (safeguard in case mealRates is missing)
          const baseMealPrice = plan.mealRates
            ? plan.mealRates.reduce((sum: number, day: any) => sum + day.pricePerDay, 0)
            : 0;

          // Quoted prices are rounded up to whole units
          const grandTotal = Math.ceil(baseRoomPrice + baseMealPrice + mandatoryTotal);

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
              mandatory,
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

          const mandatory = normalizeMandatory(
            promoPricing.mandatoryMealPlansWithPricesPerDays?.length
              ? promoPricing.mandatoryMealPlansWithPricesPerDays
              : room.mandatoryMealPlans,
          );
          const mandatoryTotal = sumMandatory(mandatory);

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

              const grandTotal = Math.ceil(discountedRoomPrice + mealPrice + mandatoryTotal);

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
                  mandatory,
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
  mandatory: MandatoryPlan[] = [],
) {
  if (!roomPrices) return [];

  return roomPrices.map((rp, index) => {
    const mealPrice = mealPrices ? mealPrices[index] : null;
    const original = originalRoomPrices ? originalRoomPrices[index] : null;
    const mealPerDay = mealPrice ? mealPrice.pricePerDay : 0;
    const mandatoryMeals = mandatory
      .map((m) => ({ name: m.name, price: priceForDay(m.days, rp.date) }))
      .filter((m) => m.price > 0);
    const mandatoryPerDay = mandatoryMeals.reduce((sum, m) => sum + m.price, 0);

    return {
      date: rp.date,
      // Falls back to the room price itself when there is no discount
      originalRoomPrice: original ? original.price : rp.price,
      roomPrice: rp.price,
      roomFormula: rp.formula,
      mealPlanName: mealPlanName ?? null,
      mealPrice: mealPerDay,
      mandatoryMeals,
      total: rp.price + mealPerDay + mandatoryPerDay,
    };
  });
}

interface MandatoryPlan {
  name: string;
  days: any[];
}

// Compulsory meal plans (e.g. a gala dinner) are charged on top of the selected meal plan.
// Accepts both the room-level shape (mealRates) and the promotion shape (mealPlanPricesPerDays).
function normalizeMandatory(plans?: any[]): MandatoryPlan[] {
  if (!Array.isArray(plans)) return [];
  return plans.map((p) => ({
    name: p.name,
    days: Array.isArray(p.mealPlanPricesPerDays)
      ? p.mealPlanPricesPerDays
      : Array.isArray(p.mealRates)
        ? p.mealRates
        : [],
  }));
}

// Compulsory plans only list the days they apply to, so match strictly by calendar date.
function priceForDay(days: any[], date: string): number {
  const day = String(date).slice(0, 10);
  const match = days.find((d) => String(d.date).slice(0, 10) === day);
  return match?.pricePerDay ?? 0;
}

function sumMandatory(plans: MandatoryPlan[]): number {
  return plans.reduce(
    (sum, p) => sum + p.days.reduce((s: number, d: any) => s + (d.pricePerDay ?? 0), 0),
    0,
  );
}
