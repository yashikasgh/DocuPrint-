import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.VERCEL ? "/tmp" : join(__dirname, "../data");
const FEEDBACK_FILE = join(DATA_DIR, "feedback.json");

const ensureDataDir = async () => {
  await mkdir(DATA_DIR, { recursive: true });
};

const readStore = async () => {
  try {
    await ensureDataDir();
    const raw = await readFile(FEEDBACK_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { forms: {}, submissions: {} };
  }
};

const writeStore = async (store) => {
  await ensureDataDir();
  await writeFile(FEEDBACK_FILE, JSON.stringify(store, null, 2), "utf-8");
};

/**
 * Save a new feedback form config and return the saved form.
 */
export const writeFeedbackForm = async (form) => {
  const store = await readStore();
  store.forms[form.formId] = form;
  if (!store.submissions[form.formId]) {
    store.submissions[form.formId] = [];
  }
  await writeStore(store);
  return form;
};

/**
 * Retrieve a single form config by formId (for public attendee page).
 */
export const readForm = async (formId) => {
  const store = await readStore();
  return store.forms[formId] || null;
};

/**
 * Return all forms (for the organizer list).
 */
export const readAllForms = async () => {
  const store = await readStore();
  return Object.values(store.forms).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

/**
 * Save an attendee's form submission.
 */
export const saveSubmission = async (formId, answers) => {
  const store = await readStore();
  const form = store.forms[formId];
  if (!form) {
    throw new Error(`Form ${formId} not found`);
  }
  if (!store.submissions[formId]) {
    store.submissions[formId] = [];
  }
  const sanitizedAnswers = Object.fromEntries(
    Object.entries(answers || {}).filter(([key]) => form.questions.some((question) => question.id === key))
  );
  const missingRequired = form.questions
    .filter((question) => question.required)
    .filter((question) => {
      const value = sanitizedAnswers[question.id];
      return value === undefined || value === null || value === "";
    });

  if (missingRequired.length > 0) {
    throw new Error(`Missing required answers for: ${missingRequired.map((question) => question.label).join(", ")}`);
  }

  const submission = {
    submissionId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    formId,
    submittedAt: new Date().toISOString(),
    answers: sanitizedAnswers,
  };
  store.submissions[formId].push(submission);
  await writeStore(store);
  return submission;
};

/**
 * Get all submissions for a form.
 */
export const getSubmissions = async (formId) => {
  const store = await readStore();
  return store.submissions[formId] || [];
};
