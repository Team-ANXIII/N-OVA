using System;
using System.Windows;

namespace NNovaHost;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        WebView.DefaultBackgroundColor = System.Drawing.Color.Transparent;
        await WebView.EnsureCoreWebView2Async();

        var targetUrl = Environment.GetEnvironmentVariable("NNOVA_URL")
                        ?? "http://localhost:3000";
        WebView.CoreWebView2.Navigate(targetUrl);
    }
}
