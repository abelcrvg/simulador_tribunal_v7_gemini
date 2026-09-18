import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import { Palette } from "lucide-react";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  if (!setTheme) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Selecionar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={theme === "light" ? "bg-accent" : ""}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-300"></div>
            <span>Branco</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={theme === "dark" ? "bg-accent" : ""}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-900 border-2 border-gray-600"></div>
            <span>Preto</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("sepia")}
          className={theme === "sepia" ? "bg-accent" : ""}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#f4ecd8] border-2 border-[#d4c4a8]"></div>
            <span>Marrom Sépia</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
