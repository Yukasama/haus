/**
 * Das Modul besteht aus Security-Funktionen für z.B. CSP, XSS, Click-Jacking,
 * HSTS und MIME-Sniffing, die durch Helmet bereitgestellt werden.
 * @packageDocumentation
 */

import {
    contentSecurityPolicy,
    frameguard,
    hidePoweredBy,
    hsts,
    noSniff,
    xssFilter,
} from 'helmet';

/**
 * Security-Funktionen für z.B. CSP, XSS, Click-Jacking, HSTS und MIME-Sniffing.
 */
export const helmetHandlers = [
    contentSecurityPolicy({
        useDefaults: true,
        directives: {
            // eslint-disable-next-line @stylistic/quotes
            defaultSrc: ["https: 'self'"],
            // eslint-disable-next-line @stylistic/quotes
            scriptSrc: ["https: 'unsafe-inline' 'unsafe-eval'"],
            // eslint-disable-next-line @stylistic/quotes
            imgSrc: ["data: 'self'"],
        },
        reportOnly: false,
    }),

    xssFilter(),
    frameguard(),
    hsts(),
    noSniff(),
    hidePoweredBy(),
];
