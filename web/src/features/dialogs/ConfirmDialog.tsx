import { Button } from '../../components/Button.tsx';
import { Dialog } from '../../components/Dialog.tsx';
import { useUiStore, type ConfirmRequest } from '../../state/uiStore.ts';
import styles from './Dialogs.module.css';

/** Asked before any command that changes something outside this machine. */
export function ConfirmDialog({ request }: { request: ConfirmRequest }) {
  const answer = useUiStore((state) => state.answerConfirm);

  return (
    <Dialog
      title={request.title}
      tone={request.danger ? 'danger' : 'default'}
      onClose={() => answer(false)}
      actions={
        <>
          <Button autoFocus onClick={() => answer(false)}>
            Cancel
          </Button>
          <Button variant={request.danger ? 'danger' : 'signal'} icon="play" onClick={() => answer(true)}>
            Yes, run it
          </Button>
        </>
      }
    >
      <p>This command reaches beyond the playground folder:</p>
      <pre className={styles.command}>{request.command}</pre>
      <ul className={styles.details}>
        {request.details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
    </Dialog>
  );
}
