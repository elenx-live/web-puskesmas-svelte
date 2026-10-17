export interface ModuleSpec {
  id: string;
  name: string;
  description: string;
  subModules: string[];
  keyRelations: string[];
}

export interface CollectionSchema {
  name: string;
  purpose: string;
  keyFields: string[];
  relations: string;
  indexes: string[];
}

export interface RoleMatrixItem {
  permission: string;
  superAdmin: boolean;
  adminWebsite: boolean;
  editor: boolean;
  operator: boolean;
  viewer: boolean;
}

export interface DecisionLogItem {
  id: string;
  topic: string;
  options: string[];
  selected: string;
  rationale: string;
  impact: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'approved';
}
