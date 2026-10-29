import GameFormModal from './GameFormModal';

export default function EditGameModal(props) {
  return (
    <GameFormModal
      mode="edit"
      {...props}
      onSubmit={(formData, gameId) => {
        if (props.onSubmit) {
          return props.onSubmit(gameId || props.game?.game_id, formData);
        }
      }}
    />
  );
}
