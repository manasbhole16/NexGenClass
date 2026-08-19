export const BANNER_THEMES = {
    purple: {
        id: 'purple',
        name: 'Royal Purple',
        gradient: 'from-purple-900 via-indigo-900 to-slate-900',
        bgAccent: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        borderAccent: 'border-purple-500',
        badge: 'bg-purple-600',
        preview: 'bg-gradient-to-r from-purple-800 to-indigo-900'
    },
    blue: {
        id: 'blue',
        name: 'Ocean Blue',
        gradient: 'from-blue-900 via-sky-900 to-slate-900',
        bgAccent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        borderAccent: 'border-blue-500',
        badge: 'bg-blue-600',
        preview: 'bg-gradient-to-r from-blue-800 to-cyan-900'
    },
    teal: {
        id: 'teal',
        name: 'Cyber Teal',
        gradient: 'from-teal-900 via-emerald-900 to-slate-900',
        bgAccent: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
        borderAccent: 'border-teal-500',
        badge: 'bg-teal-600',
        preview: 'bg-gradient-to-r from-teal-800 to-emerald-900'
    },
    emerald: {
        id: 'emerald',
        name: 'Emerald Green',
        gradient: 'from-emerald-900 via-green-900 to-slate-900',
        bgAccent: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        borderAccent: 'border-emerald-500',
        badge: 'bg-emerald-600',
        preview: 'bg-gradient-to-r from-emerald-800 to-green-900'
    },
    amber: {
        id: 'amber',
        name: 'Warm Amber',
        gradient: 'from-amber-900 via-orange-900 to-slate-900',
        bgAccent: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        borderAccent: 'border-amber-500',
        badge: 'bg-amber-600',
        preview: 'bg-gradient-to-r from-amber-800 to-orange-900'
    },
    rose: {
        id: 'rose',
        name: 'Neon Rose',
        gradient: 'from-rose-900 via-pink-900 to-slate-900',
        bgAccent: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        borderAccent: 'border-rose-500',
        badge: 'bg-rose-600',
        preview: 'bg-gradient-to-r from-rose-800 to-pink-900'
    }
};

export const getBannerGradient = (themeKey) => {
    return (BANNER_THEMES[themeKey] || BANNER_THEMES.purple).gradient;
};

export const getBannerTheme = (themeKey) => {
    return BANNER_THEMES[themeKey] || BANNER_THEMES.purple;
};
