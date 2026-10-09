import { Component, ElementRef, HostListener, OnDestroy, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  NavController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { refreshOutline, statsChartOutline } from 'ionicons/icons';
import { forkJoin } from 'rxjs';
import * as d3 from 'd3';
import { AuthService, UserProfile } from '../services/auth.service';
import { ProjectService, Project, TaskItem } from '../services/project.service';

type TaskStatus = TaskItem['status'];
type TaskPriority = TaskItem['priority'];

interface StatusSlice {
  key: TaskStatus;
  label: string;
  color: string;
  value: number;
}

interface PriorityBar {
  key: TaskPriority;
  label: string;
  value: number;
}

// Colores de estado: los mismos que usa "Mis Tareas" (tab2) para que la app sea coherente.
const STATUS_META: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'pending', label: 'Pendiente', color: '#94a3b8' },
  { key: 'in_progress', label: 'En curso', color: '#fbbf24' },
  { key: 'completed', label: 'Completada', color: '#4ade80' }
];

const PRIORITY_META: { key: TaskPriority; label: string }[] = [
  { key: 'low', label: 'Baja' },
  { key: 'medium', label: 'Media' },
  { key: 'high', label: 'Alta' }
];

const COLORS = {
  surface: '#353b41',
  track: '#434a52',
  accent: '#ea4c88',
  textPrimary: '#ffffff',
  textMuted: '#9da3a8'
};

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent
  ],
})
export class Tab4Page implements OnDestroy {
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private navCtrl = inject(NavController);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('statusChart') statusChartRef?: ElementRef<HTMLDivElement>;
  @ViewChild('projectsChart') projectsChartRef?: ElementRef<HTMLDivElement>;
  @ViewChild('priorityChart') priorityChartRef?: ElementRef<HTMLDivElement>;
  @ViewChild('tooltip') tooltipRef?: ElementRef<HTMLDivElement>;

  currentUser: UserProfile | null = null;
  projects: Project[] = [];
  myTasks: TaskItem[] = [];
  isLoading = false;
  errorMessage = '';

  statusSlices: StatusSlice[] = [];
  priorityBars: PriorityBar[] = [];

  private resizeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    addIcons({ refreshOutline, statsChartOutline });
  }

  ionViewWillEnter(): void {
    this.currentUser = this.authService.getUser();
    if (!this.currentUser) {
      this.navCtrl.navigateRoot('/login');
      return;
    }
    this.loadData();
  }

  ngOnDestroy(): void {
    clearTimeout(this.resizeTimer);
  }

  @HostListener('window:resize')
  onResize(): void {
    // Los gráficos se dibujan según el ancho disponible, así que se redibujan al rotar la pantalla.
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.renderCharts(false), 150);
  }

  loadData(event?: CustomEvent): void {
    if (!this.currentUser) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    forkJoin({
      projects: this.projectService.getProjects(this.currentUser.id),
      tasks: this.projectService.getMyTasks(this.currentUser.id)
    }).subscribe({
      next: ({ projects, tasks }) => {
        this.projects = projects.success && Array.isArray(projects.data) ? projects.data : [];
        this.myTasks = tasks.success && Array.isArray(tasks.data) ? tasks.data : [];
        this.buildSeries();
        this.finishLoading(event);
        this.renderCharts(true);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'No fue posible cargar las estadísticas.';
        this.finishLoading(event);
      }
    });
  }

  get completedPercent(): number {
    if (this.myTasks.length === 0) return 0;
    const done = this.myTasks.filter(t => t.status === 'completed').length;
    return Math.round((done / this.myTasks.length) * 100);
  }

  get overdueCount(): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.myTasks.filter(t => t.status !== 'completed' && !!t.due_date && t.due_date < today).length;
  }

  get projectsWithTasks(): Project[] {
    return this.projects.filter(p => Number(p.tasks_count) > 0);
  }

  projectPercent(project: Project): number {
    const total = Number(project.tasks_count) || 0;
    return total === 0 ? 0 : Math.round((Number(project.completed_tasks_count) / total) * 100);
  }

  private finishLoading(event?: CustomEvent): void {
    this.isLoading = false;
    if (event) {
      (event.target as HTMLIonRefresherElement).complete();
    }
    // Forzar el render del template para que existan los contenedores de los gráficos.
    this.cdr.detectChanges();
  }

  private buildSeries(): void {
    this.statusSlices = STATUS_META.map(meta => ({
      ...meta,
      value: this.myTasks.filter(t => t.status === meta.key).length
    }));
    this.priorityBars = PRIORITY_META.map(meta => ({
      ...meta,
      value: this.myTasks.filter(t => t.priority === meta.key).length
    }));
  }

  private renderCharts(animate: boolean): void {
    if (this.statusChartRef) this.renderStatusDonut(this.statusChartRef.nativeElement, animate);
    if (this.projectsChartRef) this.renderProjectBars(this.projectsChartRef.nativeElement, animate);
    if (this.priorityChartRef) this.renderPriorityBars(this.priorityChartRef.nativeElement, animate);
  }

  // -------------------------------------------------------------
  // GRÁFICO 1: Dona con mis tareas por estado
  // -------------------------------------------------------------

  private renderStatusDonut(container: HTMLElement, animate: boolean): void {
    const size = Math.min(container.clientWidth || 200, 200);
    const radius = size / 2;
    const data = this.statusSlices.filter(d => d.value > 0);
    const total = d3.sum(data, d => d.value);

    const root = d3.select(container);
    root.selectAll('*').remove();

    const svg = root.append('svg')
      .attr('width', size)
      .attr('height', size)
      .attr('viewBox', `0 0 ${size} ${size}`)
      .attr('role', 'img')
      .attr('aria-label', this.statusSlices.map(s => `${s.label}: ${s.value}`).join(', '));

    const g = svg.append('g').attr('transform', `translate(${radius},${radius})`);

    const pie = d3.pie<StatusSlice>().value(d => d.value).sort(null).padAngle(data.length > 1 ? 0.03 : 0);
    const arc = d3.arc<d3.PieArcDatum<StatusSlice>>()
      .innerRadius(radius * 0.64)
      .outerRadius(radius - 2)
      .cornerRadius(4);

    const paths = g.selectAll('path')
      .data(pie(data))
      .join('path')
      .attr('fill', d => d.data.color)
      .attr('stroke', COLORS.surface)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('pointerenter pointermove', (event: PointerEvent, d) => {
        const pct = Math.round((d.data.value / total) * 100);
        this.showTooltip(event, `<strong>${d.data.label}</strong><br>${d.data.value} tareas · ${pct}%`);
      })
      .on('pointerleave', () => this.hideTooltip());

    if (animate) {
      // Animación: cada segmento "crece" desde su ángulo inicial.
      paths.transition()
        .duration(700)
        .ease(d3.easeCubicOut)
        .attrTween('d', d => {
          const interpolate = d3.interpolate(d.startAngle, d.endAngle);
          return t => arc({ ...d, endAngle: interpolate(t) }) ?? '';
        });
    } else {
      paths.attr('d', arc);
    }

    // Número principal en el centro de la dona.
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.1em')
      .attr('fill', COLORS.textPrimary)
      .style('font-size', `${Math.round(radius * 0.38)}px`)
      .style('font-weight', '700')
      .text(`${this.completedPercent}%`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.6em')
      .attr('fill', COLORS.textMuted)
      .style('font-size', '0.75rem')
      .text('completadas');
  }

  // -------------------------------------------------------------
  // GRÁFICO 2: Barras horizontales con el avance de cada proyecto
  // -------------------------------------------------------------

  private renderProjectBars(container: HTMLElement, animate: boolean): void {
    const data = this.projectsWithTasks
      .map(p => ({ project: p, pct: this.projectPercent(p) }))
      .sort((a, b) => b.pct - a.pct);

    const width = container.clientWidth || 300;
    const rowHeight = 46;
    const barHeight = 10;
    const height = data.length * rowHeight;

    const root = d3.select(container);
    root.selectAll('*').remove();

    const svg = root.append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', data.map(d => `${d.project.title}: ${d.pct}%`).join(', '));

    const x = d3.scaleLinear().domain([0, 100]).range([0, width]);

    const rows = svg.selectAll('g.row')
      .data(data)
      .join('g')
      .attr('class', 'row')
      .attr('transform', (_, i) => `translate(0,${i * rowHeight})`)
      .style('cursor', 'pointer')
      .on('pointerenter pointermove', (event: PointerEvent, d) => {
        const p = d.project;
        this.showTooltip(
          event,
          `<strong>${this.escape(p.title)}</strong><br>${p.completed_tasks_count} de ${p.tasks_count} tareas · ${d.pct}%`
        );
      })
      .on('pointerleave', () => this.hideTooltip());

    // Área invisible más grande que la barra para que sea fácil tocarla en el móvil.
    rows.append('rect')
      .attr('width', width)
      .attr('height', rowHeight)
      .attr('fill', 'transparent');

    rows.append('text')
      .attr('x', 0)
      .attr('y', 16)
      .attr('fill', COLORS.textPrimary)
      .style('font-size', '0.8rem')
      .text(d => this.truncate(d.project.title, Math.floor((width - 50) / 7)));

    rows.append('text')
      .attr('x', width)
      .attr('y', 16)
      .attr('text-anchor', 'end')
      .attr('fill', COLORS.textMuted)
      .style('font-size', '0.75rem')
      .style('font-variant-numeric', 'tabular-nums')
      .text(d => `${d.pct}%`);

    rows.append('rect')
      .attr('y', 24)
      .attr('width', width)
      .attr('height', barHeight)
      .attr('rx', barHeight / 2)
      .attr('fill', COLORS.track);

    const bars = rows.append('rect')
      .attr('y', 24)
      .attr('height', barHeight)
      .attr('rx', barHeight / 2)
      .attr('fill', COLORS.accent)
      .attr('width', animate ? 0 : d => x(d.pct));

    if (animate) {
      bars.transition()
        .duration(700)
        .delay((_, i) => i * 60)
        .ease(d3.easeCubicOut)
        .attr('width', d => x(d.pct));
    }
  }

  // -------------------------------------------------------------
  // GRÁFICO 3: Barras verticales con mis tareas por prioridad
  // -------------------------------------------------------------

  private renderPriorityBars(container: HTMLElement, animate: boolean): void {
    const data = this.priorityBars;
    const width = container.clientWidth || 300;
    const height = 180;
    const margin = { top: 22, right: 0, bottom: 26, left: 0 };
    const innerHeight = height - margin.top - margin.bottom;

    const root = d3.select(container);
    root.selectAll('*').remove();

    const svg = root.append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', data.map(d => `Prioridad ${d.label}: ${d.value}`).join(', '));

    const x = d3.scaleBand<string>()
      .domain(data.map(d => d.label))
      .range([0, width])
      .padding(0.45);

    const y = d3.scaleLinear()
      .domain([0, Math.max(1, d3.max(data, d => d.value) ?? 1)])
      .nice()
      .range([innerHeight, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Línea base discreta.
    g.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', innerHeight)
      .attr('y2', innerHeight)
      .attr('stroke', COLORS.track);

    const columns = g.selectAll('g.col')
      .data(data)
      .join('g')
      .attr('class', 'col')
      .style('cursor', 'pointer')
      .on('pointerenter pointermove', (event: PointerEvent, d) => {
        this.showTooltip(event, `<strong>Prioridad ${d.label}</strong><br>${d.value} tareas`);
      })
      .on('pointerleave', () => this.hideTooltip());

    // Zona táctil de toda la columna.
    columns.append('rect')
      .attr('x', d => (x(d.label) ?? 0) - x.step() * x.paddingInner() / 2)
      .attr('width', x.step())
      .attr('height', innerHeight)
      .attr('fill', 'transparent');

    // Barra con extremo superior redondeado y base recta sobre la línea.
    const barPath = (d: PriorityBar, value: number): string => {
      const bx = x(d.label) ?? 0;
      const bw = x.bandwidth();
      const top = y(value);
      const h = innerHeight - top;
      const r = Math.min(4, h, bw / 2);
      if (h <= 0) return '';
      return `M${bx},${innerHeight}V${top + r}Q${bx},${top} ${bx + r},${top}` +
        `H${bx + bw - r}Q${bx + bw},${top} ${bx + bw},${top + r}V${innerHeight}Z`;
    };

    const bars = columns.append('path')
      .attr('fill', COLORS.accent)
      .attr('d', d => barPath(d, animate ? 0 : d.value));

    if (animate) {
      bars.transition()
        .duration(700)
        .delay((_, i) => i * 80)
        .ease(d3.easeCubicOut)
        .attrTween('d', d => {
          const interpolate = d3.interpolateNumber(0, d.value);
          return t => barPath(d, interpolate(t));
        });
    }

    // Valor encima de cada barra.
    columns.append('text')
      .attr('x', d => (x(d.label) ?? 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.textPrimary)
      .style('font-size', '0.8rem')
      .style('font-weight', '600')
      .text(d => d.value);

    // Etiquetas del eje X.
    columns.append('text')
      .attr('x', d => (x(d.label) ?? 0) + x.bandwidth() / 2)
      .attr('y', innerHeight + 18)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.textMuted)
      .style('font-size', '0.75rem')
      .text(d => d.label);
  }

  // -------------------------------------------------------------
  // TOOLTIP
  // -------------------------------------------------------------

  private showTooltip(event: PointerEvent, html: string): void {
    const tooltip = this.tooltipRef?.nativeElement;
    if (!tooltip) return;
    tooltip.innerHTML = html;
    tooltip.style.opacity = '1';

    // Mantener el tooltip dentro de la pantalla.
    const { offsetWidth: w, offsetHeight: h } = tooltip;
    const left = Math.min(Math.max(8, event.clientX - w / 2), window.innerWidth - w - 8);
    const top = event.clientY - h - 14 < 8 ? event.clientY + 18 : event.clientY - h - 14;
    tooltip.style.transform = `translate(${left}px, ${top}px)`;
  }

  hideTooltip(): void {
    const tooltip = this.tooltipRef?.nativeElement;
    if (tooltip) tooltip.style.opacity = '0';
  }

  private truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
  }

  private escape(text: string): string {
    return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }
}
