export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  errors: string[];
  data?: Record<string, unknown>[];
}

export type TransformerFunction = (value: unknown) => unknown;

export type DataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object';

export interface ValidationRule {
  type?: DataType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  custom?: (value: unknown) => boolean;
  message?: string;
}

export interface DataMapping {
  sourceField: string;
  targetField: string;
  required?: boolean;
  transformer?: TransformerFunction;
  validate?: (value: unknown) => boolean;
  rules?: ValidationRule[];
  dataType?: DataType;
}

export interface MappingValidationError {
  field: string;
  message: string;
  row?: number;
}

export interface MappingValidationResult {
  isValid: boolean;
  errors: MappingValidationError[];
}

export type ImportPhase =
  | 'validation'
  | 'mapping'
  | 'transformation'
  | 'import';

export interface ImportProgress {
  phase: string;
  current: number;
  total: number;
  message?: string;
}

export type ProgressCallback = (progress: ImportProgress) => void;

export interface ImportOptions {
  dryRun?: boolean;
  progressCallback?: ProgressCallback;
  retryCount?: number;
  retryDelay?: number; // ミリ秒
}

export interface DataImporter {
  validate(progressCallback?: ProgressCallback): ValidationResult;
  import(options?: ImportOptions): ImportResult;
  mapData(mapping: DataMapping[]): void;
  validateMapping(): MappingValidationResult;
  validateDataTypes(
    data: Record<string, unknown>[],
    mapping: DataMapping[]
  ): ValidationResult;
  getHeaders(): string[];
  generateDefaultMapping(): DataMapping[];
}
