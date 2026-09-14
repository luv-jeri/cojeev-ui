# Homepage restored for rework

The owner rejected the living-gallery homepage on 12 September 2026 and requested the earlier homepage back. This is a rollback, not approval of another redesign.

- Preserved candidate: `codex/homepage-rework-preserved`, commit `d6f310cb97a58bb0e96bc95329853ed8ad552097`.
- Restored homepage source: the parent of `caf80ee664cfcfb77588e80996eaa21539cb3255`.
- The homepage, its stylesheet and featured component shelf are restored together. Tests are returned to that interface, preserving the independent canonical-origin correction and disposable reporting CI fixture.
- Component implementations, reporting, infrastructure, secrets and environment isolation are not reverted.
- The previous paired `final-d6f310c` packages and their evidence remain historical artifacts. They contain the rejected homepage and must not be promoted.
- README artwork and the approved-direction mock are retained for reference; they are not evidence of approval of the rejected implementation.

No production deployment is part of this rollback. A future homepage rework needs review before promotion.

## Rollback verification

- The four restored homepage source files match the pre-redesign revision byte for byte.
- The static production build exports all 189 pages and passes TypeScript; lint passes.
- Six launch-browser checks pass against the restored local preview: desktop light/dark, six live specimens, drawer focus return, copy-to-install, mobile maker navigation, installation/privacy pages and reduced motion.
- The restored baseline's launch test still expected the shape studio to be absent. Its assertion now checks that the original studio is present and the rejected profile stage is absent; the homepage itself is unchanged from the earlier source.
- Preview: `http://127.0.0.1:60724/`. This is a local preview, not a deployment or a new release artifact.
