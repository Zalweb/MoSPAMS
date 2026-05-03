import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
): { ref: RefObject<T | null>; isVisible: boolean } {
  const { threshold = 0.1, rootMargin = '0px 0px -50px 0px', triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'scale-up';
  delay?: number;
  threshold?: number;
}

export function AnimatedSection({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
  threshold = 0.1,
}: AnimatedSectionProps) {
  const { ref: scrollRef, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold });

  const animationClasses = {
    'fade-up': 'translate-y-8 opacity-0',
    'fade-in': 'opacity-0',
    'slide-left': '-translate-x-12 opacity-0',
    'slide-right': 'translate-x-12 opacity-0',
    'scale-up': 'scale-95 opacity-0',
  };

  const visibleClasses = {
    'fade-up': 'translate-y-0 opacity-100',
    'fade-in': 'opacity-100',
    'slide-left': 'translate-x-0 opacity-100',
    'slide-right': 'translate-x-0 opacity-100',
    'scale-up': 'scale-100 opacity-100',
  };

  return (
    <div
      ref={scrollRef}
      className={`transition-all duration-700 ease-out ${className} ${
        isVisible ? visibleClasses[animation] : animationClasses[animation]
      }`}
      style={{
        transitionDelay: isVisible ? `${delay}ms` : '0ms',
        transitionProperty: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}