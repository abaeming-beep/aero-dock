/**
 * Choosing a mode's tile icon.
 *
 * The grid is laid out inline rather than in a popover. A floating panel
 * has to win a positioning fight with whatever is around it, and it lost
 * that fight once already; a plain wrapped grid cannot be covered, cannot
 * be clipped, and works the same at every window size.
 *
 * A chosen icon is stored as `i:<id>` in the mode's glyph field. An empty
 * glyph means the name's first letter. Anything else is shown as plain text,
 * which is how a glyph saved by an older version keeps working.
 */

import {
  Briefcase,
  Building2,
  Calendar,
  Camera,
  ChartColumn,
  Code,
  Dices,
  Files,
  Film,
  FlaskConical,
  Gamepad2,
  Headphones,
  House,
  Joystick,
  Leaf,
  Mail,
  Moon,
  Music,
  NotebookPen,
  Palette,
  Pencil,
  Puzzle,
  Rocket,
  Settings,
  Star,
  Sun,
  Target,
  Tv,
  Waves,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { t } from "../../i18n";

const icons = t.modes.icons;

/** Ordered by theme so related icons sit together in the wrapped grid. */
const PRESETS: { id: keyof typeof icons; Icon: LucideIcon }[] = [
  { id: "briefcase", Icon: Briefcase },
  { id: "chart", Icon: ChartColumn },
  { id: "notes", Icon: NotebookPen },
  { id: "files", Icon: Files },
  { id: "calendar", Icon: Calendar },
  { id: "office", Icon: Building2 },
  { id: "mail", Icon: Mail },
  { id: "focus", Icon: Target },
  { id: "code", Icon: Code },
  { id: "tools", Icon: Wrench },
  { id: "pieces", Icon: Puzzle },
  { id: "settings", Icon: Settings },
  { id: "design", Icon: Palette },
  { id: "draw", Icon: Pencil },
  { id: "experiment", Icon: FlaskConical },
  { id: "launch", Icon: Rocket },
  { id: "games", Icon: Gamepad2 },
  { id: "arcade", Icon: Joystick },
  { id: "headphones", Icon: Headphones },
  { id: "music", Icon: Music },
  { id: "film", Icon: Film },
  { id: "photos", Icon: Camera },
  { id: "watching", Icon: Tv },
  { id: "dice", Icon: Dices },
  { id: "water", Icon: Waves },
  { id: "leaf", Icon: Leaf },
  { id: "day", Icon: Sun },
  { id: "night", Icon: Moon },
  { id: "fast", Icon: Zap },
  { id: "star", Icon: Star },
  { id: "home", Icon: House },
];

const toGlyph = (id: string) => `i:${id}`;

function letterFor(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "M";
}

/** What a mode's tile shows: its chosen icon, else its stored or first letter. */
export function ModeGlyph({ name, glyph, size = 16 }: { name: string; glyph: string; size?: number }) {
  const trimmed = glyph.trim();
  const preset = PRESETS.find((p) => toGlyph(p.id) === trimmed);
  if (preset) return <preset.Icon size={size} aria-hidden />;
  return <>{trimmed || letterFor(name)}</>;
}

interface Props {
  /** The mode's name, used for the letter fallback. */
  name: string;
  glyph: string;
  onChange: (glyph: string) => void;
}

export function ModeIconPicker({ name, glyph, onChange }: Props) {
  const chosen = glyph.trim();
  const letter = letterFor(name);

  return (
    <div className="icon-picker-grid">
      {/* the letter fallback sits first, as one of the choices */}
      <button
        type="button"
        className="icon-picker-option"
        data-active={!chosen}
        title={t.modes.useLetter(letter)}
        aria-label={t.modes.useLetter(letter)}
        onClick={() => onChange("")}
      >
        {letter}
      </button>
      {PRESETS.map(({ id, Icon }) => (
        <button
          key={id}
          type="button"
          className="icon-picker-option"
          data-active={chosen === toGlyph(id)}
          title={icons[id]}
          aria-label={icons[id]}
          onClick={() => onChange(toGlyph(id))}
        >
          <Icon size={16} aria-hidden />
        </button>
      ))}
    </div>
  );
}
