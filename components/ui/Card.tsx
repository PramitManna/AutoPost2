'use client';

import * as React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLMotionProps<"div"> {
    glass?: boolean;
    hoverEffect?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, glass = false, hoverEffect = false, children, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial={hoverEffect ? { y: 0 } : undefined}
                whileHover={hoverEffect ? { y: -4, transition: { duration: 0.2 } } : undefined}
                className={cn(
                    "rounded-xl border bg-white text-zinc-950 shadow-sm dark:bg-zinc-950 dark:text-zinc-50",
                    glass && "glass-card border-zinc-300/50 dark:border-zinc-800/50",
                    !glass && "border-zinc-300 dark:border-zinc-800",
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);
Card.displayName = "Card";

export { Card };
