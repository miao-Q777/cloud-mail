import { createI18n } from 'vue-i18n';
import en from './en.js'
import zh from './zh.js'
const i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'zh',
    messages: {
        zh,
        en
    },
});
export default i18n;
