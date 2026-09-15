// Carries input typed into the prerendered field while its enhancement loads.
// This module has no browser side effects, so server and client share the tree.
export const startup = {prompt:null as string|null};
