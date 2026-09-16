import { api } from "./api";
import type { Category, CategoryType } from "../types/category";

export const categoriesService = {
  async list(categoryType?: CategoryType) {
    const { data } = await api.get<Category[]>("/categories/", {
      params: categoryType ? { category_type: categoryType } : undefined,
    });
    return data;
  },

  async create(payload: { name: string; category_type: CategoryType; icon?: string; color?: string }) {
    const { data } = await api.post<Category>("/categories/", payload);
    return data;
  },
};
