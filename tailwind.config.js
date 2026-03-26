/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./*.{html,js}"],
    theme: {
        extend: {
            fontFamily: {
                'mono': ['"Roboto Mono"', 'monospace']
            },
            container: {
                center: true,
                padding: '2rem',
                screens: {
                    sm: '480px',
                    md: '580px',
                    lg: '680px',
                    xl: '780px',
                    '2xl': '880px',
                },
            },
            typography: {
                DEFAULT: {
                    css: {
                        maxWidth: '150%',
                    },
                },
            },
            colors: {
                primary: {
                    DEFAULT: '#0D9488',
                    dark: '#0F766E',
                },
                surface: {
                    DEFAULT: '#FFFAF0',
                    light: '#E4F4F2',
                }
            },
            screens: {
                'xl2': '1200px',
            },
        }
    },
    plugins: [
        require('@tailwindcss/typography'),
        function({ addComponents }) {
            addComponents({
                // Layout Components
                '.page-container': {
                    '@apply max-w-[1920px] mx-auto flex flex-col lg:flex-row': {},
                },

                // Typography Components
                '.title-text': {
                    '@apply text-4xl font-bold text-primary leading-tight': {},
                },

                // Sidebar Components
                '.sticky-sidebar': {
                    '@apply hidden lg:block w-[25%] xl2:w-[30%] fixed top-0 left-0 h-screen bg-surface border-r border-black/20 z-50 pt-12': {},
                },
                '.sidebar-content': {
                    '@apply p-8 pl-12 flex flex-col justify-between h-full': {},
                },
                '.sidebar-points': {
                    '@apply mt-8 space-y-4 text-base text-[#2c2e33]': {},
                },

                // Header Components
                '.mobile-header': {
                    '@apply lg:hidden container px-6 py-8 text-left': {},
                },
                '.mobile-points': {
                    '@apply mt-6 space-y-3 border-l border-primary-dark/40 pl-4 text-sm text-[#2c2e33]': {},
                },

                // Main Content Components
                '.main-container': {
                    '@apply w-full lg:w-[75%] xl2:w-[70%] px-4 lg:px-12 py-8 lg:ml-[25%] xl2:ml-[30%]': {},
                },
                '.section': {
                    '@apply mb-16 relative px-6 py-8 bg-surface-light/50 rounded-lg border border-primary-dark/20 scroll-mt-8': {},
                },
                '.section-heading': {
                    '@apply text-2xl font-bold text-primary mb-6 inline-block relative border-b-4 border-dotted border-primary-dark/50 pb-2': {},
                },
                '.content-paragraph': {
                    '@apply prose mt-4 w-full': {},
                },
                '.bullet-list': {
                    '@apply list-disc pl-5 text-[#2c2e33] space-y-2': {},
                },

                '.section-label': {
                    '@apply text-xs uppercase tracking-[0.28em] text-primary-dark': {},
                },
                '.shell-panel': {
                    '@apply mt-6 rounded-lg border border-primary-dark/20 bg-black/10 p-4': {},
                },
                '.shell-panel-title': {
                    '@apply text-sm uppercase tracking-[0.22em] text-[#2c2e33]': {},
                },
                '.shell-panel-copy': {
                    '@apply mt-2 text-sm text-[#2c2e33]': {},
                },

                // Footer Components
                '.page-footer': {
                    '@apply mt-16 text-center text-[#2c2e33]': {},
                },
            });
        },
    ],
}
