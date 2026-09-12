function dailySeries(previous, rows) {
  if (!Array.isArray(rows)) throw new Error("Invalid traffic series");
  const result = { ...previous };
  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}T00:00:00Z$/.test(row.timestamp) || !Number.isInteger(row.count) || row.count < 0 || !Number.isInteger(row.uniques) || row.uniques < 0) throw new Error("Invalid daily traffic counter");
    result[row.timestamp.slice(0, 10)] = { count: row.count, uniques: row.uniques };
  }
  return result;
}

export function mergeTrafficSnapshot(previous, repository, snapshot, observedAt) {
  if (previous && (previous.schemaVersion !== 1 || previous.repository !== repository)) throw new Error("Stored repository or schema does not match");
  const stars = snapshot.repository.stargazers_count;
  const forks = snapshot.repository.forks_count;
  if (!Number.isInteger(stars) || stars < 0 || !Number.isInteger(forks) || forks < 0 || Number.isNaN(Date.parse(observedAt))) throw new Error("Invalid repository snapshot");
  return {
    schemaVersion: 1,
    repository,
    observedAt,
    clones: dailySeries(previous?.clones, snapshot.clones.clones),
    views: dailySeries(previous?.views, snapshot.views.views),
    repositoryDaily: { ...previous?.repositoryDaily, [observedAt.slice(0, 10)]: { stars, forks } },
  };
}
