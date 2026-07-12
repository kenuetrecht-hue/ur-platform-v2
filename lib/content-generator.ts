/**
 * Content Generator Service - Phase 4
 * Handles graph/chart generation and image creation
 */

export interface ChartData {
  id: string;
  type: "line" | "bar" | "pie" | "area" | "scatter";
  title: string;
  labels: string[];
  datasets: ChartDataset[];
  options?: ChartOptions;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins?: Record<string, any>;
  scales?: Record<string, any>;
}

export interface ImageTemplate {
  id: string;
  name: string;
  type: "thumbnail" | "banner" | "poster" | "infographic" | "cover";
  width: number;
  height: number;
  elements: ImageElement[];
}

export interface ImageElement {
  id: string;
  type: "text" | "shape" | "image" | "gradient";
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  style?: ImageElementStyle;
}

export interface ImageElementStyle {
  fill?: string;
  stroke?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: string;
  opacity?: number;
  rotation?: number;
}

export interface GeneratedContent {
  id: string;
  type: "chart" | "image";
  title: string;
  sourceId: string;
  outputUri?: string;
  thumbnail?: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  createdAt: string;
}

class ContentGenerator {
  private charts: Map<string, ChartData> = new Map();
  private templates: Map<string, ImageTemplate> = new Map();
  private generatedContent: Map<string, GeneratedContent> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default image templates
   */
  private initializeDefaultTemplates(): void {
    const templates: ImageTemplate[] = [
      {
        id: "template-thumbnail",
        name: "Video Thumbnail",
        type: "thumbnail",
        width: 1280,
        height: 720,
        elements: [
          {
            id: "bg",
            type: "gradient",
            x: 0,
            y: 0,
            width: 1280,
            height: 720,
            style: { fill: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
          },
          {
            id: "title",
            type: "text",
            x: 50,
            y: 250,
            width: 1180,
            height: 220,
            content: "Your Title Here",
            style: {
              fontSize: 80,
              fontFamily: "Arial, sans-serif",
              fontWeight: "bold",
              fill: "#ffffff",
              textAlign: "center",
            },
          },
        ],
      },
      {
        id: "template-banner",
        name: "Social Media Banner",
        type: "banner",
        width: 1200,
        height: 628,
        elements: [
          {
            id: "bg",
            type: "gradient",
            x: 0,
            y: 0,
            width: 1200,
            height: 628,
            style: { fill: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)" },
          },
        ],
      },
      {
        id: "template-infographic",
        name: "Infographic",
        type: "infographic",
        width: 1080,
        height: 1350,
        elements: [
          {
            id: "bg",
            type: "gradient",
            x: 0,
            y: 0,
            width: 1080,
            height: 1350,
            style: { fill: "#ffffff" },
          },
        ],
      },
    ];

    templates.forEach((t) => this.templates.set(t.id, t));
  }

  /**
   * Create a new chart
   */
  createChart(
    type: ChartData["type"],
    title: string,
    labels: string[],
    datasets: ChartDataset[]
  ): ChartData {
    const chart: ChartData = {
      id: `chart-${Date.now()}`,
      type,
      title,
      labels,
      datasets,
      options: {
        responsive: true,
        maintainAspectRatio: true,
      },
    };

    this.charts.set(chart.id, chart);
    return chart;
  }

  /**
   * Get chart by ID
   */
  getChart(chartId: string): ChartData | undefined {
    return this.charts.get(chartId);
  }

  /**
   * Update chart data
   */
  updateChartData(chartId: string, datasets: ChartDataset[]): ChartData | undefined {
    const chart = this.charts.get(chartId);
    if (!chart) {
      return undefined;
    }

    chart.datasets = datasets;
    return chart;
  }

  /**
   * Export chart as image
   */
  async exportChart(chartId: string): Promise<string> {
    const chart = this.charts.get(chartId);
    if (!chart) {
      throw new Error(`Chart ${chartId} not found`);
    }

    const generated: GeneratedContent = {
      id: `gen-${Date.now()}`,
      type: "chart",
      title: chart.title,
      sourceId: chartId,
      status: "processing",
      createdAt: new Date().toISOString(),
    };

    this.generatedContent.set(generated.id, generated);

    // Simulate processing
    return new Promise((resolve) => {
      setTimeout(() => {
        const outputUri = `chart-${chartId}-${Date.now()}.png`;
        generated.outputUri = outputUri;
        generated.thumbnail = outputUri;
        generated.status = "completed";
        resolve(outputUri);
      }, 1000);
    });
  }

  /**
   * Get available image templates
   */
  getTemplates(): ImageTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): ImageTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Create custom template
   */
  createTemplate(
    name: string,
    type: ImageTemplate["type"],
    width: number,
    height: number
  ): ImageTemplate {
    const template: ImageTemplate = {
      id: `template-${Date.now()}`,
      name,
      type,
      width,
      height,
      elements: [],
    };

    this.templates.set(template.id, template);
    return template;
  }

  /**
   * Add element to template
   */
  addElementToTemplate(templateId: string, element: ImageElement): ImageTemplate | undefined {
    const template = this.templates.get(templateId);
    if (!template) {
      return undefined;
    }

    template.elements.push(element);
    return template;
  }

  /**
   * Update element in template
   */
  updateElement(templateId: string, elementId: string, updates: Partial<ImageElement>): ImageTemplate | undefined {
    const template = this.templates.get(templateId);
    if (!template) {
      return undefined;
    }

    const element = template.elements.find((e) => e.id === elementId);
    if (element) {
      Object.assign(element, updates);
    }

    return template;
  }

  /**
   * Remove element from template
   */
  removeElement(templateId: string, elementId: string): ImageTemplate | undefined {
    const template = this.templates.get(templateId);
    if (!template) {
      return undefined;
    }

    template.elements = template.elements.filter((e) => e.id !== elementId);
    return template;
  }

  /**
   * Generate image from template
   */
  async generateImage(templateId: string, customizations?: Record<string, any>): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const generated: GeneratedContent = {
      id: `gen-${Date.now()}`,
      type: "image",
      title: template.name,
      sourceId: templateId,
      status: "processing",
      createdAt: new Date().toISOString(),
    };

    this.generatedContent.set(generated.id, generated);

    // Simulate processing
    return new Promise((resolve) => {
      setTimeout(() => {
        const outputUri = `image-${templateId}-${Date.now()}.png`;
        generated.outputUri = outputUri;
        generated.thumbnail = outputUri;
        generated.status = "completed";
        resolve(outputUri);
      }, 1200);
    });
  }

  /**
   * Get generated content
   */
  getGeneratedContent(contentId: string): GeneratedContent | undefined {
    return this.generatedContent.get(contentId);
  }

  /**
   * List all generated content
   */
  listGeneratedContent(): GeneratedContent[] {
    return Array.from(this.generatedContent.values());
  }

  /**
   * Delete generated content
   */
  deleteGeneratedContent(contentId: string): boolean {
    return this.generatedContent.delete(contentId);
  }

  /**
   * List all charts
   */
  listCharts(): ChartData[] {
    return Array.from(this.charts.values());
  }

  /**
   * Delete chart
   */
  deleteChart(chartId: string): boolean {
    return this.charts.delete(chartId);
  }
}

export default ContentGenerator;
