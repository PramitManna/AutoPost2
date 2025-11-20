"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { FiSun, FiMoon, FiMonitor } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    const toggleTheme = () => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
    };

    return (
        <motion.div
            className="fixed bottom-6 right-6 z-[100]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <Button
                variant="secondary"
                size="sm"
                onClick={toggleTheme}
                className="h-10 w-10 rounded-full p-0 shadow-lg border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md"
                aria-label="Toggle theme"
            >
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={theme}
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {theme === 'light' && <FiSun className="h-5 w-5 text-orange-500" />}
                        {theme === 'dark' && <FiMoon className="h-5 w-5 text-blue-400" />}
                        {theme === 'system' && <FiMonitor className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />}
                    </motion.div>
                </AnimatePresence>
            </Button>
        </motion.div>
    );
}
