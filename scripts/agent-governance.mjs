#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const tasksDir = path.join(root, '.agents', 'tasks');
const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const fail = (message) => {
  console.error(`::error::${message}`);
  process.exitCode = 1;
};

const readJsonYaml = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${path.relative(root, file)} must use JSON-compatible YAML: ${error.message}`);
    return null;
  }
};

const globToRegExp = (glob) => {
  let expression = '^';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    const next = glob[i + 1];
    if (char === '*' && next === '*') {
      if (glob[i + 2] === '/') {
        expression += '(?:.*/)?';
        i += 2;
      } else {
        expression += '.*';
        i += 1;
      }
    } else if (char === '*') {
      expression += '[^/]*';
    } else if ('\\^$+?.()|{}[]'.includes(char)) {
      expression += `\\${char}`;
    } else {
      expression += char;
    }
  }
  return new RegExp(`${expression}$`);
};

const matchesAny = (file, patterns = []) => patterns.some((pattern) => globToRegExp(pattern).test(file));

const taskFiles = fs.existsSync(tasksDir)
  ? fs.readdirSync(tasksDir).filter((file) => /\.ya?ml$/i.test(file)).sort()
  : [];

if (taskFiles.length === 0) fail('No task contracts found under .agents/tasks/.');

const tasks = new Map();
for (const filename of taskFiles) {
  const task = readJsonYaml(path.join(tasksDir, filename));
  if (!task) continue;

  const required = [
    'id',
    'objective',
    'roles',
    'base_sha',
    'allow_paths',
    'deny_paths',
    'acceptance_commands',
    'risk',
    'reviewers',
    'lease_minutes',
  ];
  for (const key of required) if (task[key] === undefined) fail(`${filename}: missing ${key}`);

  if (!/^[A-Z][A-Z0-9]+-[0-9]+$/.test(task.id ?? '')) fail(`${filename}: invalid task id`);
  if (!/^[0-9a-f]{40}$/i.test(task.base_sha ?? '')) fail(`${filename}: base_sha must be a full commit SHA`);
  if (!['low', 'medium', 'high'].includes(task.risk)) fail(`${filename}: risk must be low, medium, or high`);
  if (!Array.isArray(task.allow_paths) || task.allow_paths.length === 0) fail(`${filename}: allow_paths cannot be empty`);
  if (!Array.isArray(task.deny_paths)) fail(`${filename}: deny_paths must be an array`);
  if (!Array.isArray(task.acceptance_commands) || task.acceptance_commands.length === 0) fail(`${filename}: acceptance_commands cannot be empty`);
  if (!Number.isInteger(task.lease_minutes) || task.lease_minutes < 5 || task.lease_minutes > 240) fail(`${filename}: lease_minutes must be 5..240`);

  const expectedRoles = { planner: 'antigravity', implementer: 'codex', reviewer: 'grok' };
  for (const [role, agent] of Object.entries(expectedRoles)) {
    if (task.roles?.[role] !== agent) fail(`${filename}: ${role} must be ${agent}`);
  }
  if (task.risk === 'high' && !task.roles?.verifier) fail(`${filename}: high risk requires a verifier`);
  tasks.set(task.id, task);
}

const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '';
const branchMatch = branch.match(/^agent\/(?:antigravity|codex|grok|verifier)\/([A-Z][A-Z0-9]+-[0-9]+)$/);
const taskId = process.env.AGENT_TASK_ID || branchMatch?.[1];
let changedFiles = [];

if (taskId) {
  const task = tasks.get(taskId);
  if (!task) {
    fail(`Task ${taskId} has no .agents/tasks/${taskId}.yaml contract.`);
  } else {
    const base = valueAfter('--base') || task.base_sha;
    try {
      changedFiles = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' })
        .split('\n')
        .map((file) => file.trim())
        .filter(Boolean);
    } catch (error) {
      fail(`Unable to calculate changed files from ${base}: ${error.message}`);
    }

    const implicit = [`.agents/tasks/${taskId}.yaml`, `.agents/runs/${taskId}/**`];
    for (const file of changedFiles) {
      if (matchesAny(file, task.deny_paths)) fail(`${file} is denied by ${taskId}`);
      if (!matchesAny(file, [...task.allow_paths, ...implicit])) fail(`${file} is outside ${taskId} allow_paths`);
    }

    const highRisk = [
      'src/**/auth/**',
      'src/**/stripe/**',
      'src/**/payment/**',
      'supabase/migrations/**',
      '.github/workflows/**',
      'vercel.json',
    ];
    if (changedFiles.some((file) => matchesAny(file, highRisk)) && !task.roles?.verifier) {
      fail(`${taskId} touches high-risk paths and requires an independent verifier.`);
    }
  }
} else {
  console.log('No agent/<agent>/<task-id> branch detected; contract validation only.');
}

const evidence = {
  generated_at: new Date().toISOString(),
  branch,
  task_id: taskId ?? null,
  contracts_checked: tasks.size,
  changed_files: changedFiles,
  result: process.exitCode ? 'failed' : 'passed',
};
fs.writeFileSync(path.join(root, 'agent-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Agent governance: ${evidence.result}; ${tasks.size} contract(s) checked.`);
