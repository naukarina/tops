import { Component, AfterViewInit, OnDestroy, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import Chart from 'chart.js/auto';
import { AccommodationService } from '../accommodations/services/accommodation.service';
import { Accommodation } from '../accommodations/models/accommodation.model';

// Dataviz reference palette (light mode, validated against the white card surface).
// Blue/orange are categorical slots 1-2 and identify Confirmed/Quotation everywhere
// on this page; cancelled stays neutral gray. Chrome colors per the palette's ink roles.
const VIZ = {
  confirmed: '#2a78d6',
  quotation: '#eb6834',
  cancelled: '#898781',
  muted: '#898781',
  grid: '#e1e0d9',
  surface: '#ffffff',
};

interface StatusRow {
  label: string;
  count: number;
  value: number;
  color: string;
  share: number; // 0..1 of total bookings
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private service = inject(AccommodationService);
  private sub?: Subscription;
  private charts: Chart[] = [];
  private viewReady = false;
  private bookings: Accommodation[] = [];

  loading = true;
  currency = 'EUR';
  stats = {
    total: 0,
    confirmed: 0,
    quotations: 0,
    cancelled: 0,
    confirmedValue: 0,
    pipelineValue: 0,
    upcoming: 0,
  };
  statusRows: StatusRow[] = [];
  upcomingCheckIns: Accommodation[] = [];

  ngOnInit(): void {
    this.sub = this.service.getAll().subscribe((data) => {
      this.bookings = data ?? [];
      this.computeStats();
      this.loading = false;
      this.scheduleRender();
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.scheduleRender();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.destroyCharts();
  }

  statusColor(status: Accommodation['status']): string {
    return status === 'CONFIRMED'
      ? VIZ.confirmed
      : status === 'QUOTATION'
        ? VIZ.quotation
        : VIZ.cancelled;
  }

  private computeStats(): void {
    const now = new Date();
    const in30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
    const s = {
      total: this.bookings.length,
      confirmed: 0,
      quotations: 0,
      cancelled: 0,
      confirmedValue: 0,
      pipelineValue: 0,
      upcoming: 0,
    };

    for (const b of this.bookings) {
      const price = Math.ceil(b.totalPrice ?? 0);
      if (b.status === 'CONFIRMED') {
        s.confirmed++;
        s.confirmedValue += price;
      } else if (b.status === 'QUOTATION') {
        s.quotations++;
        s.pipelineValue += price;
      } else {
        s.cancelled++;
      }
      const start = b.startDate?.toDate();
      if (start && b.status !== 'CANCELLED' && start >= now && start < in30Days) {
        s.upcoming++;
      }
    }
    this.stats = s;
    this.currency = this.bookings.find((b) => b.currency)?.currency ?? 'EUR';

    this.statusRows = [
      { label: 'Confirmed', count: s.confirmed, value: s.confirmedValue, color: VIZ.confirmed },
      { label: 'Quotation', count: s.quotations, value: s.pipelineValue, color: VIZ.quotation },
      { label: 'Cancelled', count: s.cancelled, value: 0, color: VIZ.cancelled },
    ].map((r) => ({ ...r, share: s.total ? r.count / s.total : 0 }));

    this.upcomingCheckIns = this.bookings
      .filter((b) => b.status !== 'CANCELLED' && b.startDate && b.startDate.toDate() >= now)
      .sort((a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime())
      .slice(0, 6);
  }

  // Charts live inside @if blocks, so wait for both data and the rendered view
  private scheduleRender(): void {
    if (!this.viewReady || this.loading) return;
    setTimeout(() => this.renderCharts());
  }

  private destroyCharts(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  private renderCharts(): void {
    this.destroyCharts();
    if (this.stats.total === 0) return;
    this.renderMonthlyChart();
    this.renderTopHotelsChart();
  }

  // Booking value per check-in month, zero-filled between first and last month, capped at 12
  private monthlySeries(): { labels: string[]; confirmed: number[]; quotation: number[] } {
    const byMonth = new Map<string, { confirmed: number; quotation: number }>();
    let min: Date | null = null;
    let max: Date | null = null;

    for (const b of this.bookings) {
      if (b.status === 'CANCELLED' || !b.startDate) continue;
      const d = b.startDate.toDate();
      const month = new Date(d.getFullYear(), d.getMonth(), 1);
      if (!min || month < min) min = month;
      if (!max || month > max) max = month;
      const key = `${month.getFullYear()}-${month.getMonth()}`;
      const bucket = byMonth.get(key) ?? { confirmed: 0, quotation: 0 };
      if (b.status === 'CONFIRMED') bucket.confirmed += Math.ceil(b.totalPrice ?? 0);
      else bucket.quotation += Math.ceil(b.totalPrice ?? 0);
      byMonth.set(key, bucket);
    }

    const labels: string[] = [];
    const confirmed: number[] = [];
    const quotation: number[] = [];
    if (!min || !max) return { labels, confirmed, quotation };

    const cursor = new Date(min);
    const months: Date[] = [];
    while (cursor <= max) {
      months.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    for (const m of months.slice(-12)) {
      const bucket = byMonth.get(`${m.getFullYear()}-${m.getMonth()}`);
      labels.push(m.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }));
      confirmed.push(bucket?.confirmed ?? 0);
      quotation.push(bucket?.quotation ?? 0);
    }
    return { labels, confirmed, quotation };
  }

  private renderMonthlyChart(): void {
    const canvas = document.getElementById('monthlyValueChart') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { labels, confirmed, quotation } = this.monthlySeries();
    const fmt = (v: number) => v.toLocaleString('en-GB');

    this.charts.push(
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Confirmed',
              data: confirmed,
              backgroundColor: VIZ.confirmed,
              borderColor: VIZ.surface,
              borderWidth: 2,
              borderRadius: 4,
              maxBarThickness: 28,
            },
            {
              label: 'Quotation',
              data: quotation,
              backgroundColor: VIZ.quotation,
              borderColor: VIZ.surface,
              borderWidth: 2,
              borderRadius: 4,
              maxBarThickness: 28,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: { color: VIZ.muted },
              border: { color: VIZ.grid },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: { color: VIZ.grid },
              border: { display: false },
              ticks: { color: VIZ.muted, callback: (v) => fmt(Number(v)) },
            },
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { usePointStyle: true, pointStyleWidth: 10, boxHeight: 6, color: '#52514e' },
            },
            tooltip: {
              callbacks: {
                label: (item) =>
                  ` ${item.dataset.label}: ${this.currency} ${fmt(item.parsed.y ?? 0)}`,
              },
            },
          },
        },
      }),
    );
  }

  private renderTopHotelsChart(): void {
    const canvas = document.getElementById('topHotelsChart') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const byHotel = new Map<string, number>();
    for (const b of this.bookings) {
      if (b.status === 'CANCELLED') continue;
      const name = b.hotelName || 'Unknown hotel';
      byHotel.set(name, (byHotel.get(name) ?? 0) + Math.ceil(b.totalPrice ?? 0));
    }
    const top = [...byHotel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const fmt = (v: number) => v.toLocaleString('en-GB');

    this.charts.push(
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: top.map(([name]) => name),
          datasets: [
            {
              label: 'Booking value',
              data: top.map(([, v]) => v),
              backgroundColor: VIZ.confirmed,
              borderRadius: 4,
              maxBarThickness: 20,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: VIZ.grid },
              border: { display: false },
              ticks: { color: VIZ.muted, callback: (v) => fmt(Number(v)) },
            },
            y: {
              grid: { display: false },
              border: { color: VIZ.grid },
              ticks: {
                color: '#52514e',
                callback: function (value) {
                  const label = this.getLabelForValue(Number(value));
                  return label.length > 22 ? label.slice(0, 21) + '…' : label;
                },
              },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (item) => ` ${this.currency} ${fmt(item.parsed.x ?? 0)}`,
              },
            },
          },
        },
      }),
    );
  }
}
