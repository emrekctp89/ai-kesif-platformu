// src/app/actions.js
// Bu dosya, tüm Server Action modüllerini tek bir yerden dışa aktaran bir "barrel" dosyasıdır.
// Mevcut tüm import'lar ("@/app/actions") değiştirilmeden çalışmaya devam eder.

export * from './actions/auth';
export * from './actions/tools';
export * from './actions/categories';
export * from './actions/content';
export * from './actions/community';
export * from './actions/showcase';
export * from './actions/challenge';
export * from './actions/user';
export * from './actions/messages';
export * from './actions/projects';
export * from './actions/ai';
export * from './actions/notifications';
export * from './actions/newsletter';
export * from './actions/payment';
export * from './actions/bounty';
export * from './actions/launch';
export * from './actions/feedback';
export * from './actions/reports';
export * from './actions/admin';

// Stub exports to satisfy imports from components that are not fully implemented yet
export async function updateProjectItems() {
  console.log('updateProjectItems not implemented');
}

export async function deleteProject() {
  console.log('deleteProject not implemented');
}

export async function submitShowcaseToChallenge() {
  console.log('submitShowcaseToChallenge not implemented');
}
