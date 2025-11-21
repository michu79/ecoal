import { configService } from "../services/ConfigService";
import { logger } from "../utils/logger";
import lang_en from "./lang_en";
import lang_pl from "./lang_pl";
import type { Translations } from "./types";

const translations = {
  pl: lang_pl,
  en: lang_en,
};

export default function t(key: keyof Translations) {
  let lang = configService.getConfig().entity_language;

  if (!Object.keys(translations).includes(lang)) {
    logger.error(`Unsupported language: ${lang}. Falling back to English`);
    lang = "en";
  }

  return translations[lang as keyof typeof translations][key];
}
