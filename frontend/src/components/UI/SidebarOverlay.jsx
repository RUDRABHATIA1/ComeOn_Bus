import { useDispatch, useSelector } from 'react-redux';
import { selectUiState, setSidebarOpen } from '../../redux/uiSlice';

export function SidebarOverlay() {
  const dispatch = useDispatch();
  const { isSidebarOpen } = useSelector(selectUiState);

  if (!isSidebarOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[990] sm:hidden backdrop-blur-sm transition-opacity duration-300"
      onClick={() => dispatch(setSidebarOpen(false))}
    />
  );
}
