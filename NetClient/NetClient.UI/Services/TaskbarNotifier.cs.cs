using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

namespace NetClient.UI.Services
{
    public class TaskbarNotifier
    {
        private readonly Form _mainForm;
        private bool _isFlashing;

        public TaskbarNotifier(Form mainForm)
        {
            _mainForm = mainForm;
        }

        [DllImport("user32.dll")]
        private static extern bool FlashWindowEx(ref FLASHWINFO info);

        [StructLayout(LayoutKind.Sequential)]
        private struct FLASHWINFO
        {
            public uint cbSize;
            public IntPtr hwnd;
            public uint dwFlags;
            public uint uCount;
            public uint dwTimeout;
        }

        private const uint FLASHW_STOP = 0;
        private const uint FLASHW_ALL = 3;
        private const uint FLASHW_TIMERNOFG = 12;
        private int _previousUnread = 0;

        public void Update(int unreadCount)
        {
            if (_mainForm.IsDisposed || !_mainForm.IsHandleCreated)
                return;

            bool hasNewNotification = unreadCount > _previousUnread;

            _previousUnread = unreadCount;

            if (unreadCount <= 0)
            {
                Stop();
                return;
            }

            if (hasNewNotification && !_mainForm.ContainsFocus && !_isFlashing)
            {
                Flash();
            }
        }

        public void Flash()
        {
            if (_mainForm.IsDisposed || !_mainForm.IsHandleCreated)
                return;

            var info = new FLASHWINFO
            {
                cbSize = (uint)Marshal.SizeOf<FLASHWINFO>(),
                hwnd = _mainForm.Handle,
                dwFlags = FLASHW_ALL | FLASHW_TIMERNOFG,
                uCount = uint.MaxValue,
                dwTimeout = 0
            };

            FlashWindowEx(ref info);
            _isFlashing = true;
        }

        public void Stop()
        {
            if (_mainForm.IsDisposed || !_mainForm.IsHandleCreated)
                return;

            var info = new FLASHWINFO
            {
                cbSize = (uint)Marshal.SizeOf<FLASHWINFO>(),
                hwnd = _mainForm.Handle,
                dwFlags = FLASHW_STOP,
                uCount = 0,
                dwTimeout = 0
            };

            FlashWindowEx(ref info);
            _isFlashing = false;
        }
    }
}
