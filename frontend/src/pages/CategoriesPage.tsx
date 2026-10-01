import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { categoriesService } from "../services/categories.service";
import type { Category, CategoryType } from "../types/category";
import { extractErrorMessage } from "../utils/errors";

const TYPE_LABEL: Record<CategoryType, string> = {
  EXPENSE: "Despesas",
  INCOME: "Receitas",
  BOTH: "Ambos",
};

const EMPTY_FORM = { name: "", category_type: "EXPENSE" as CategoryType, icon: "" };

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories, isLoading } = useQuery({ queryKey: ["categories"], queryFn: () => categoriesService.list() });

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setForm({ name: category.name, category_type: category.category_type, icon: category.icon });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = { name: form.name, category_type: form.category_type, icon: form.icon };
      if (editingCategory) {
        await categoriesService.update(editingCategory.id, payload);
      } else {
        await categoriesService.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setModalOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível salvar a categoria."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    await categoriesService.update(category.id, { is_active: !category.is_active });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Excluir a categoria "${category.name}"?`)) return;
    try {
      await categoriesService.remove(category.id);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (err) {
      alert(extractErrorMessage(err, "Não foi possível excluir a categoria."));
    }
  };

  const groups: CategoryType[] = ["EXPENSE", "INCOME", "BOTH"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-tinta dark:text-papel">Categorias</h1>
          <p className="text-sm text-cinza dark:text-papel/60">
            As categorias padrão valem para todo mundo — qualquer um pode ajustar, ativar/desativar ou excluir.
          </p>
        </div>
        <Button onClick={openCreateModal}>+ Nova categoria</Button>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && (!categories || categories.length === 0) && (
        <EmptyState title="Nenhuma categoria encontrada" />
      )}

      {!isLoading &&
        categories &&
        categories.length > 0 &&
        groups.map((type) => {
          const items = categories.filter((category) => category.category_type === type);
          if (items.length === 0) return null;

          return (
            <Card key={type}>
              <h2 className="mb-3 font-semibold text-tinta dark:text-papel">{TYPE_LABEL[type]}</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((category) => (
                  <div
                    key={category.id}
                    className={`flex items-center gap-3 rounded-lg border border-cinza/15 px-3 py-2.5 dark:border-papel/10 ${
                      category.is_active ? "" : "opacity-50"
                    }`}
                  >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-nevoa text-lg dark:bg-noite-borda">
                      {category.icon || <Tag size={16} className="text-cinza/60" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-tinta dark:text-papel">{category.name}</p>
                      {!category.is_active && <p className="text-xs text-cinza dark:text-papel/60">Inativa</p>}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={category.is_active}
                        onClick={() => handleToggleActive(category)}
                        title={category.is_active ? "Desativar" : "Ativar"}
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          category.is_active ? "bg-petroleo" : "bg-cinza/30 dark:bg-noite-borda"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            category.is_active ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(category)}
                        aria-label="Editar categoria"
                        title="Editar categoria"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-cinza hover:bg-nevoa hover:text-tinta dark:text-papel/60 dark:hover:bg-noite-borda dark:hover:text-papel"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        aria-label="Excluir categoria"
                        title="Excluir categoria"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-cinza hover:bg-despesa/10 hover:text-despesa dark:text-papel/60"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}

      <Modal title={editingCategory ? "Editar categoria" : "Nova categoria"} isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select
            label="Tipo"
            value={form.category_type}
            onChange={(e) => setForm({ ...form, category_type: e.target.value as CategoryType })}
          >
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
            <option value="BOTH">Ambos</option>
          </Select>
          <Input
            label="Ícone (emoji, opcional)"
            placeholder="🏷️"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
          />
          {error && <p className="text-sm text-despesa">{error}</p>}
          <Button onClick={handleSave} isLoading={isSubmitting}>
            {editingCategory ? "Salvar" : "Criar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
