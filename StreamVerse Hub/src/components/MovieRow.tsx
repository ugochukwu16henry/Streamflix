import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MovieCard, type CardItem } from "./MovieCard";

export function MovieRow({ title, items }: { title: string; items: CardItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="group/row mb-10">
      <h2 className="px-6 md:px-12 mb-3 text-xl md:text-2xl font-display tracking-wide">{title}</h2>
      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          className="hidden md:flex absolute left-0 top-0 bottom-0 z-10 w-12 items-center justify-center bg-black/40 opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black/70"
        >
          <ChevronLeft className="size-8" />
        </button>
        <div
          ref={ref}
          className="flex gap-3 overflow-x-auto px-6 md:px-12 pb-4 scrollbar-hide scroll-smooth"
        >
          {items.map((item) => (
            <MovieCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
        <button
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          className="hidden md:flex absolute right-0 top-0 bottom-0 z-10 w-12 items-center justify-center bg-black/40 opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black/70"
        >
          <ChevronRight className="size-8" />
        </button>
      </div>
    </section>
  );
}