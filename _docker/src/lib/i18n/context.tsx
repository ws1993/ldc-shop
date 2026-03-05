'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import en from '@/locales/en.json'
import zh from '@/locales/zh.json'
import { isLocale, type Locale } from './shared'

type Translations = typeof en

const translations: Record<Locale, Translations> = { en, zh }

interface I18nContextType {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

function getNestedValue(obj: any, path: string): string {
    return path.split('.').reduce((acc, part) => acc?.[part], obj) || path
}

function interpolate(text: string, params?: Record<string, string | number>): string {
    if (!params) return text
    return Object.entries(params).reduce((acc, [key, value]) => {
        return acc.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
    }, text)
}

export function I18nProvider({ children, initialLocale = 'en' }: { children: ReactNode; initialLocale?: Locale }) {
    const [locale, setLocaleState] = useState<Locale>(initialLocale)

    useEffect(() => {
        const saved = localStorage.getItem('ldc-locale')
        const resolved = isLocale(saved) ? saved : initialLocale

        if (resolved !== locale) {
            setLocaleState(resolved)
            return
        }
        localStorage.setItem('ldc-locale', resolved)
        document.cookie = `ldc-locale=${resolved}; path=/; max-age=31536000`
    }, [initialLocale, locale])

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale)
        localStorage.setItem('ldc-locale', newLocale)
        document.cookie = `ldc-locale=${newLocale}; path=/; max-age=31536000`
    }

    const t = (key: string, params?: Record<string, string | number>): string => {
        const text = getNestedValue(translations[locale], key)
        return interpolate(text, params)
    }

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    )
}

export function useI18n() {
    const context = useContext(I18nContext)
    if (!context) {
        // Return default values for server-side rendering
        return {
            locale: 'en' as Locale,
            setLocale: () => { },
            t: (key: string, params?: Record<string, string | number>) => {
                const text = getNestedValue(en, key)
                return interpolate(text, params)
            }
        }
    }
    return context
}
