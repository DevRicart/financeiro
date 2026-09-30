import { api } from "./api";
import type { Category, CategoryType } from "../types/category";

interface CategoryPayload {
  name: string;
  category_type: CategoryType;
  icon?: string;
  color?: string;
}

export const categoriesService = {
  async list(categoryType?: CategoryType) {
    const { data } = await api.get<Category[]>("/categories/", {
      params: categoryType ? { category_type: categoryType } : undefined,
    });
    return data;
  },

  async create(payload: CategoryPayload) {
    const { data } = await api.post<Category>("/categories/", payload);
    return data;
  },

  async update(id: number, payload: Partial<CategoryPayload & { is_active: boolean }>) {
    const { data } = await api.patch<Category>(`/categories/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await api.delete(`/categories/${id}/`);
  },
};
