import { ClassicTemplate } from './classic.js';
import { ModernTemplate } from './modern.js';

export const templates = {
  classic: new ClassicTemplate(),
  modern: new ModernTemplate()
};

export const getTemplate = (id) => {
  return templates[id] || templates.classic;
};

export const getAllTemplates = () => {
  return Object.entries(templates).map(([id, tpl]) => ({
    id,
    name: tpl.name,
    description: tpl.description,
    options: tpl.options
  }));
};