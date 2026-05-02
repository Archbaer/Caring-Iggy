"use client";

import type { AnimalGender, AnimalSize, AnimalStatusCode } from "@/lib/types";
import {
  GENDER_OPTIONS,
  SIZE_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/constants/animal-options";

const INPUT_CLASS =
  "w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] text-sm px-4 py-3 placeholder-[var(--color-ink-faint)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200";

const LABEL_CLASS = "flex flex-col gap-1.5";
const LABEL_TEXT_CLASS = "text-sm font-medium text-[var(--color-ink)]";
const FIELD_WRAPPER_CLASS = "space-y-2";

interface AnimalFormFieldsProps {
  formState: AnimalFormState;
  onChange: (field: keyof AnimalFormState, value: string) => void;
}

interface AnimalFormState {
  name: string;
  animalType: string;
  breed: string;
  status: AnimalStatusCode;
  gender: AnimalGender | "";
  size: AnimalSize | "";
  dateOfBirth: string;
  intakeDate: string;
  temperament: string;
  imageUrl: string;
  description: string;
}

export function AnimalFormFields({ formState, onChange }: AnimalFormFieldsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={FIELD_WRAPPER_CLASS}>
          <label className={LABEL_CLASS} htmlFor="name">
            <span className={LABEL_TEXT_CLASS}>Name</span>
            <input
              id="name"
              className={INPUT_CLASS}
              value={formState.name}
              onChange={(event) => onChange("name", event.target.value)}
              required
            />
          </label>
        </div>

        <div className={FIELD_WRAPPER_CLASS}>
          <label className={LABEL_CLASS} htmlFor="animalType">
            <span className={LABEL_TEXT_CLASS}>Animal type</span>
            <input
              id="animalType"
              className={INPUT_CLASS}
              value={formState.animalType}
              onChange={(event) => onChange("animalType", event.target.value)}
            />
          </label>
        </div>

        <div className={FIELD_WRAPPER_CLASS}>
          <label className={LABEL_CLASS} htmlFor="breed">
            <span className={LABEL_TEXT_CLASS}>Breed</span>
            <input
              id="breed"
              className={INPUT_CLASS}
              value={formState.breed}
              onChange={(event) => onChange("breed", event.target.value)}
            />
          </label>
        </div>

        <div className={FIELD_WRAPPER_CLASS}>
          <label className={LABEL_CLASS} htmlFor="status">
            <span className={LABEL_TEXT_CLASS}>Status</span>
            <select
              id="status"
              className={INPUT_CLASS}
              value={formState.status}
              onChange={(event) =>
                onChange("status", event.target.value as AnimalStatusCode)
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={FIELD_WRAPPER_CLASS}>
          <label className={LABEL_CLASS} htmlFor="gender">
            <span className={LABEL_TEXT_CLASS}>Gender</span>
            <select
              id="gender"
              className={INPUT_CLASS}
              value={formState.gender}
              onChange={(event) =>
                onChange("gender", event.target.value as AnimalGender | "")
              }
            >
              <option value="">Unspecified</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={FIELD_WRAPPER_CLASS}>
          <label className={LABEL_CLASS} htmlFor="size">
            <span className={LABEL_TEXT_CLASS}>Size</span>
            <select
              id="size"
              className={INPUT_CLASS}
              value={formState.size}
              onChange={(event) =>
                onChange("size", event.target.value as AnimalSize | "")
              }
            >
              <option value="">Unspecified</option>
              {SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={FIELD_WRAPPER_CLASS}>
          <label className={LABEL_CLASS} htmlFor="dateOfBirth">
            <span className={LABEL_TEXT_CLASS}>Date of birth</span>
            <input
              id="dateOfBirth"
              type="date"
              className={INPUT_CLASS}
              value={formState.dateOfBirth}
              onChange={(event) => onChange("dateOfBirth", event.target.value)}
            />
          </label>
        </div>

        <div className={FIELD_WRAPPER_CLASS}>
          <label className={LABEL_CLASS} htmlFor="intakeDate">
            <span className={LABEL_TEXT_CLASS}>Intake date</span>
            <input
              id="intakeDate"
              type="date"
              className={INPUT_CLASS}
              value={formState.intakeDate}
              onChange={(event) => onChange("intakeDate", event.target.value)}
            />
          </label>
        </div>

        <div className={`${FIELD_WRAPPER_CLASS} md:col-span-2`}>
          <label className={LABEL_CLASS} htmlFor="temperament">
            <span className={LABEL_TEXT_CLASS}>Temperament</span>
            <input
              id="temperament"
              className={INPUT_CLASS}
              value={formState.temperament}
              onChange={(event) => onChange("temperament", event.target.value)}
            />
          </label>
        </div>

        <div className={`${FIELD_WRAPPER_CLASS} md:col-span-2`}>
          <label className={LABEL_CLASS} htmlFor="imageUrl">
            <span className={LABEL_TEXT_CLASS}>Image URL</span>
            <input
              id="imageUrl"
              className={INPUT_CLASS}
              value={formState.imageUrl}
              onChange={(event) => onChange("imageUrl", event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className={FIELD_WRAPPER_CLASS}>
        <label className={LABEL_CLASS} htmlFor="description">
          <span className={LABEL_TEXT_CLASS}>Description</span>
          <textarea
            id="description"
            className={`${INPUT_CLASS} resize-none`}
            rows={4}
            value={formState.description}
            onChange={(event) => onChange("description", event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
