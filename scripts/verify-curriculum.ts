/**
 * Runs every local lesson for real, in a throwaway sandbox, and checks that
 * each command ends the way the lesson says it does.
 *
 * Chapters that need GitHub are not executed (that would create repositories
 * on someone's account); their commands are only checked against the policy.
 *
 *   npm run verify:curriculum
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'mainline-verify-'));
process.env.MAINLINE_SANDBOX = sandbox;

const { chapters, fillTemplate } = await import('@mainline/curriculum');
const { execute } = await import('../server/src/exec/runner.ts');
const { plan } = await import('../server/src/exec/policy.ts');
const { tokenize } = await import('../server/src/exec/tokenize.ts');
const { takeSnapshot } = await import('../server/src/git/snapshot.ts');
const { runSetup } = await import('../server/src/routes/sandbox.ts');
const { ensureWorkspace, resetWorkspace, resolveInside } = await import('../server/src/sandbox/workspace.ts');

const values = { ghUser: 'octocat', repoName: 'mainline-playground-test' };
let failures = 0;

const fail = (where: string, message: string) => {
  failures += 1;
  console.log(`  FAIL  ${where}\n        ${message.trim().split('\n').join('\n        ')}`);
};

await ensureWorkspace();

for (const chapter of chapters) {
  const local = chapter.setup !== null && !chapter.needs;
  console.log(`\n${chapter.number}. ${chapter.title}${local ? '' : '  (policy check only: needs GitHub)'}`);

  if (local) {
    await resetWorkspace();
    const setupLog = await runSetup(chapter.setup ?? []);
    const broken = setupLog.find((line) => !line.ok);
    if (broken) {
      fail(`setup: ${broken.command}`, broken.output);
      continue;
    }
  }

  for (const step of chapter.steps) {
    for (const action of step.actions) {
      if (action.kind === 'edit') {
        if (local) await fs.writeFile(resolveInside(action.file), action.solution, 'utf8');
        continue;
      }
      const command = fillTemplate(action.run, values);
      const where = `${step.id}: ${command}`;

      if (!local) {
        const planned = plan(tokenize(command));
        if (planned.kind === 'reject') fail(where, planned.reason);
        else console.log(`  ok    [${planned.kind === 'spawn' ? planned.impact : 'local'}] ${command.slice(0, 90)}`);
        continue;
      }

      let output = '';
      const result = await execute(command, { confirmed: false }, (event) => {
        if (event.type === 'output') output += event.data;
        if (event.type === 'rejected') output += `rejected: ${event.reason}`;
        if (event.type === 'confirm') output += 'asked for confirmation';
      });
      const failed = !result.ran || result.code !== 0;
      if (failed !== Boolean(action.failsOnPurpose)) {
        fail(where, `exit ${result.code}${action.failsOnPurpose ? ' (expected a failure)' : ''}\n${output}`);
      } else {
        console.log(`  ok    ${command.slice(0, 96)}`);
      }
    }
  }

  if (local) {
    const snapshot = await takeSnapshot();
    const dirty = snapshot.operation !== null;
    console.log(
      `  end   ${snapshot.commits.filter((c) => c.reachable).length} commits, ` +
        `${snapshot.commits.filter((c) => !c.reachable).length} ghosts, ` +
        `branches: ${snapshot.branches.map((b) => b.name).join(', ') || 'none'}` +
        `${dirty ? `, STILL IN ${snapshot.operation}` : ''}`,
    );
    if (dirty) fail('end of chapter', `left in the middle of a ${snapshot.operation}`);
  }
}

await fs.rm(sandbox, { recursive: true, force: true });
console.log(failures === 0 ? '\nAll lessons behave as written.' : `\n${failures} problem(s).`);
process.exit(failures === 0 ? 0 : 1);
