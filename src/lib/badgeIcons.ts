import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Flame,
  Footprints,
  Headphones,
  Map,
  PenLine,
  RotateCcw,
  Sparkles,
  Star,
  Sunrise,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Map nama ikon (field `icon` di BadgeDefinition) ke komponen lucide-react. */
export const BADGE_ICONS: Record<string, LucideIcon> = {
  Footprints,
  Flame,
  CheckCircle2,
  Star,
  Zap,
  Headphones,
  BookOpen,
  PenLine,
  Sunrise,
  Sparkles,
  Trophy,
  Map,
  RotateCcw,
  ClipboardCheck,
};

export function getBadgeIcon(iconName: string): LucideIcon {
  return BADGE_ICONS[iconName] ?? Award;
}
