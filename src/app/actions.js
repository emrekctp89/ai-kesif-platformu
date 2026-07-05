// Stub fonksiyonlar (build hatasını gidermek için)
export const getAiProjectStrategy = async (...args) => {
  console.warn('getAiProjectStrategy henüz implemente edilmedi');
  return { error: 'Bu özellik henüz geliştirilmedi.' };
};

export const toggleChallengeVote = async (...args) => {
  console.warn('toggleChallengeVote henüz implemente edilmedi');
  return { error: 'Bu özellik henüz geliştirilmedi.' };
};

export const updateChallenge = async (...args) => {
  console.warn('updateChallenge henüz implemente edilmedi');
  return { error: 'Bu özellik henüz geliştirilmedi.' };
};

export const generateChallengeIdeasWithAi = async (...args) => {
  console.warn('generateChallengeIdeasWithAi henüz implemente edilmedi');
  return { error: 'Bu özellik henüz geliştirilmedi.' };
};

export const createChallengeManually = async (...args) => {
  console.warn('createChallengeManually henüz implemente edilmedi');
  return { error: 'Bu özellik henüz geliştirilmedi.' };
};

export const createProject = async (...args) => {
  console.warn('createProject henüz implemente edilmedi');
  return { error: 'Bu özellik henüz geliştirilmedi.' };
};

export const updateProject = async (...args) => {
  console.warn('updateProject henüz implemente edilmedi');
  return { error: 'Bu özellik henüz geliştirilmedi.' };
};

export const updateProjectItems = async (...args) => {
  console.warn('updateProjectItems henüz implemente edilmedi');
  return { error: 'Bu özellik henüz geliştirilmedi.' };
};

export const deleteProject = async (...args) => {
  console.warn('deleteProject henüz implemente edilmedi');
  return { error: 'Bu özellik henüz geliştirilmedi.' };
};

export const submitShowcaseToChallenge = async (...args) => {
  console.warn('submitShowcaseToChallenge henüz implemente edilmedi');
  return { error: 'Bu özellik henüz geliştirilmedi.' };
};

// Mevcut fonksiyonlar
export { getProjectSuggestions } from './actions/projects';
export { generateChallenge } from './actions/challenge';
