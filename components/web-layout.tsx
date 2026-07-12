import { View, ScrollView, Platform , useWindowDimensions , Text, Pressable } from "react-native";
import { cn } from "@/lib/utils";

/**
 * Web Layout Components for Desktop Optimization
 * Provides responsive layout patterns for web and mobile
 */

interface WebLayoutProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

interface SidebarLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  sidebarWidth?: "narrow" | "normal" | "wide";
  className?: string;
}

interface GridLayoutProps {
  children: React.ReactNode;
  columns?: number;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Centered container with max-width for web
 * Adapts to mobile full-width
 */
export function WebContainer({ children, className, maxWidth = "2xl" }: WebLayoutProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth];

  if (!isWeb) {
    return <View className={className}>{children}</View>;
  }

  return (
    <View className={cn("mx-auto", maxWidthClass, className)}>
      {children}
    </View>
  );
}

/**
 * Split-pane layout for desktop (sidebar + content)
 * Stacks vertically on mobile
 */
export function SidebarLayout({
  sidebar,
  content,
  sidebarWidth = "normal",
  className,
}: SidebarLayoutProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const sidebarWidthClass = {
    narrow: "w-48",
    normal: "w-64",
    wide: "w-80",
  }[sidebarWidth];

  if (!isDesktop) {
    return (
      <View className={cn("flex-1", className)}>
        {sidebar}
        {content}
      </View>
    );
  }

  return (
    <View className={cn("flex-row flex-1", className)}>
      <View className={cn(sidebarWidthClass, "border-r border-border bg-surface")}>
        {sidebar}
      </View>
      <View className="flex-1">{content}</View>
    </View>
  );
}

/**
 * Responsive grid layout
 * Adapts column count based on screen size
 */
export function GridLayout({
  children,
  columns = 3,
  gap = "md",
  className,
}: GridLayoutProps) {
  const { width } = useWindowDimensions();

  // Responsive column logic
  let responsiveColumns = 1;
  if (width >= 768) responsiveColumns = 2;
  if (width >= 1024) responsiveColumns = columns;

  const gapClass = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  }[gap];

  const colsClass = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  }[responsiveColumns] || "md:grid-cols-3";

  return (
    <View className={cn("flex-row flex-wrap", gapClass, className)}>
      {children}
    </View>
  );
}

/**
 * Desktop modal component
 * Centered modal for web, full-screen on mobile
 */
interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg";
}

export function WebModal({ visible, onClose, children, title, size = "md" }: ModalProps) {
  const { width } = useWindowDimensions();
  
  if (!visible) return null;
  const isDesktop = width >= 1024;

  const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  }[size];

  if (!isDesktop) {
    return (
      <View className="absolute inset-0 bg-black/50 flex items-center justify-center">
        <View className="bg-background rounded-t-2xl w-full max-h-[90vh]">
          {title && (
            <View className="border-b border-border p-4">
              <Text className="text-lg font-bold text-foreground">{title}</Text>
            </View>
          )}
          <ScrollView className="flex-1">{children}</ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <View className={cn(sizeClass, "bg-background rounded-lg shadow-xl border border-border")}>
        {title && (
          <View className="border-b border-border p-4 flex-row justify-between items-center">
            <Text className="text-lg font-bold text-foreground">{title}</Text>
            <Pressable onPress={onClose} className="p-2">
              <Text className="text-muted text-xl">✕</Text>
            </Pressable>
          </View>
        )}
        <ScrollView className="flex-1 max-h-[80vh]">{children}</ScrollView>
      </View>
    </View>
  );
}

/**
 * Responsive header for web
 * Sticky header with navigation
 */
interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function WebHeader({ title, subtitle, actions, className }: HeaderProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View
      className={cn(
        "bg-surface border-b border-border",
        isDesktop ? "sticky top-0 z-40 px-6 py-4" : "px-4 py-3",
        className
      )}
    >
      <View className="flex-row justify-between items-center gap-4">
        <View className="flex-1">
          <Text className={cn("text-foreground font-bold", isDesktop ? "text-2xl" : "text-xl")}>
            {title}
          </Text>
          {subtitle && (
            <Text className={cn("text-muted", isDesktop ? "text-sm" : "text-xs")}>
              {subtitle}
            </Text>
          )}
        </View>
        {actions && <View className="flex-row gap-2">{actions}</View>}
      </View>
    </View>
  );
}

/**
 * Data table component for web
 * Responsive table that becomes a card list on mobile
 */
interface TableColumn {
  key: string;
  label: string;
  width?: string;
  render?: (value: any) => React.ReactNode;
}

interface TableProps {
  columns: TableColumn[];
  data: any[];
  className?: string;
}

export function WebTable({ columns, data, className }: TableProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  if (!isDesktop) {
    return (
      <View className={cn("gap-4", className)}>
        {data.map((row, idx) => (
          <View key={idx} className="bg-surface rounded-lg p-4 border border-border gap-3">
            {columns.map((col) => (
              <View key={col.key} className="flex-row justify-between">
                <Text className="text-muted text-sm font-semibold">{col.label}</Text>
                <Text className="text-foreground text-sm">
                  {col.render ? col.render(row[col.key]) : row[col.key]}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className={cn("overflow-x-auto", className)}>
      <View className="bg-surface rounded-lg border border-border">
        {/* Table Header */}
        <View className="flex-row border-b border-border bg-muted/10">
          {columns.map((col) => (
            <View key={col.key} className={cn("p-4 flex-1", col.width)}>
              <Text className="text-muted text-sm font-semibold">{col.label}</Text>
            </View>
          ))}
        </View>

        {/* Table Body */}
        {data.map((row, idx) => (
          <View key={idx} className={cn("flex-row border-b border-border", idx === data.length - 1 && "border-b-0")}>
            {columns.map((col) => (
              <View key={col.key} className={cn("p-4 flex-1", col.width)}>
                <Text className="text-foreground text-sm">
                  {col.render ? col.render(row[col.key]) : row[col.key]}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Responsive form layout
 * Two-column on desktop, single column on mobile
 */
interface FormLayoutProps {
  children: React.ReactNode;
  columns?: 1 | 2;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function FormLayout({
  children,
  columns = 2,
  gap = "md",
  className,
}: FormLayoutProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const gapClass = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  }[gap];

  const colsClass = isDesktop && columns === 2 ? "flex-row" : "flex-col";

  return (
    <View className={cn("flex", colsClass, gapClass, className)}>
      {children}
    </View>
  );
}

// Re-export for convenience
export { Pressable } from "react-native";
