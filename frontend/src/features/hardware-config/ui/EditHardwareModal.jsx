import HardwareProfileFormModal from './HardwareProfileFormModal';

/**
 * EditHardwareModal wrapper reusing unified HardwareProfileFormModal (DRY compliant)
 */
export default function EditHardwareModal(props) {
  return <HardwareProfileFormModal {...props} mode="edit" />;
}
