# Custom Categories Specification

## Purpose

Dynamic category management replacing hardcoded category arrays. Supports full CRUD, default seeding, Spanish-to-English key migration, and a dedicated UI manager.

## Requirements

### Requirement: Category Entity

The system MUST define a `Category` entity with fields: `id`, `name`, `type` (income|expense), `color`, `icon` (optional), and `isDefault`.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Valid expense category | A Category with type='expense' | Created | Entity is valid and persists |
| Valid income category | A Category with type='income' | Created | Entity is valid and persists |
| Missing required field | A Category with no name | Created | System rejects with validation error |

### Requirement: Category Repository Interface

The system SHALL define a `CategoryRepository` interface with methods: `findAll()`, `findById(id)`, `save(category)`, `delete(id)`.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Find all categories | Repository has categories | `findAll()` called | Returns all categories |
| Find by ID | Category with id='x' exists | `findById('x')` called | Returns matching category |
| Save new category | Category with no id | `save(category)` called | Category assigned UUID and stored |
| Delete category | Category with id='x' exists | `delete('x')` called | Category removed from storage |

### Requirement: Default Category Seeding

The system MUST seed default categories on first app load when no categories exist in storage.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| First load — no categories | Storage key `finance-dashboard-categories` missing | App initializes | Default categories created with `isDefault=true` |
| Existing categories present | Storage key exists with categories | App initializes | Seeding skipped |

### Requirement: Spanish-to-English Key Migration

The system SHALL detect existing transactions using Spanish category keys (`Alimentación`, `Transporte`, `Servicios`) and map them to English domain keys (`food`, `transport`, `housing`).

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Spanish keys detected | Transactions have Spanish category strings | Migration runs | Each transaction's category mapped to English key |
| No Spanish keys | All transactions use English keys | Migration runs | No changes applied |
| Unknown Spanish key | Transaction has unrecognized category string | Migration runs | Transaction category set to 'other' |

### Requirement: useCategories Hook

The system MUST provide a `useCategories()` hook returning `{ categories, addCategory, updateCategory, deleteCategory, isLoading }`.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| Hook called | App renders component using hook | `useCategories()` invoked | Returns categories list and CRUD functions |
| Add category | Hook loaded | `addCategory(newCategory)` called | New category persisted and list re-renders |
| Update category | Hook loaded, category exists | `updateCategory(id, changes)` called | Category updated in storage |
| Delete non-default category | Category with `isDefault=false` | `deleteCategory(id)` called | Category removed |
| Delete default category | Category with `isDefault=true` | `deleteCategory(id)` called | System rejects deletion with error |

### Requirement: Category Manager UI

The system MUST provide a `CategoryManager` component enabling users to view, create, edit, and delete categories with a modal form.

| Scenario | Given | When | Then |
|----------|-------|------|------|
| View categories | User opens CategoryManager | Component renders | All categories displayed with name, color, type |
| Create category | User fills form with valid data | Submits form | New category appears in list |
| Edit category | User selects existing category | Modifies and submits | Category updated in list |
| Delete category | User selects non-default category | Confirms deletion | Category removed from list |
| Color picker | User creates/edits category | Selects color | Color stored and previewed |
