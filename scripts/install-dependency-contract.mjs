/** Presence and attribution are separate when a scaffold already supplies a runtime. */
export function motionDependencyEvidence(scaffoldPackages, installedPackages, declaredByPayload) {
  const alreadyInScaffold = scaffoldPackages.has("motion");
  const availableForConsumer = installedPackages.has("motion");
  const addedForConsumer = availableForConsumer && !alreadyInScaffold;
  if (declaredByPayload && !availableForConsumer) throw new Error("The declared motion runtime is missing from the consumer");
  if (!declaredByPayload && addedForConsumer) throw new Error("The registry added an undeclared motion runtime");
  return { declaredByPayload, alreadyInScaffold, availableForConsumer, addedForConsumer };
}
