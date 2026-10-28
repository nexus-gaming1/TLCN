import HardwareProfileFormModal from './HardwareProfileFormModal';

/**
 * CreateHardwareModal wrapper reusing unified HardwareProfileFormModal (DRY compliant)
 */
export default function CreateHardwareModal(props) {
  return <HardwareProfileFormModal {...props} mode="create" />;
}
