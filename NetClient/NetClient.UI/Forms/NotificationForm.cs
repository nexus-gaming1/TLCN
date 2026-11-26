using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;
using NetClient.UI.Services;
namespace NetClient.UI
{
    public partial class NotificationForm : Form
    {
        private readonly NotificationStore _notificationStore;
        private readonly TaskbarNotifier _taskbarNotifier;
        public NotificationForm(NotificationStore notificationStore)
        {
            InitializeComponent();
            _notificationStore = notificationStore;
            _notificationStore.NotificationsChanged += OnNotificationsChanged;
            _taskbarNotifier = new TaskbarNotifier(this);
            LoadNotification();
        }
        public void LoadNotification()
        {
            var groups = _notificationStore.GetGroups();

            collapse1.Items.Clear();

            foreach (var group in groups)
            {
                var item = new AntdUI.CollapseItem
                {
                    Text = group.UnreadCount > 0
                        ? $"{group.Title} ({group.UnreadCount})"
                        : group.Title,
                    Expand = false,
                    Full = true
                };

                foreach (var notification in group.Items)
                {
                    var row = new AntdUI.Label
                    {
                        Text = $"{(notification.IsRead ? "" : "[Mới] ")}{notification.Title}\n{notification.Message}",
                        Dock = DockStyle.Top,
                        Height = 40,
                        TextAlign = ContentAlignment.MiddleLeft
                    };
                    row.Click += (s, e) =>
                    {
                        _notificationStore.MarkAsRead(notification.Id);
                    };
                    item.Controls.Add(row);
                }

                collapse1.Items.Add(item);
            }
        }


        private void OnNotificationsChanged()
        {
            if (IsDisposed || !IsHandleCreated)
                return;

            if (InvokeRequired)
            {
                BeginInvoke(new Action(LoadNotification));
                return;
            }

            LoadNotification();
            if (!Visible)
            {
                Show();
            }

            _taskbarNotifier.Update(_notificationStore.TotalUnread);
        }

        private void NotificationForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            _notificationStore.NotificationsChanged -= OnNotificationsChanged;

        }

        private void NotificationForm_Activated(object sender, EventArgs e)
        {
            _taskbarNotifier.Stop();
        }

        private void NotificationForm_Deactivate(object sender, EventArgs e)
        {
            _taskbarNotifier.Update(_notificationStore.TotalUnread);
        }
    }
}
