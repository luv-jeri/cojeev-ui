import worker from 'harness-selected-worker';

export default {
  async fetch(request, env, ctx) {
    await env.HARNESS_LOG.fetch(new Request(request.url));
    return worker.fetch(request, env, ctx);
  },
};
