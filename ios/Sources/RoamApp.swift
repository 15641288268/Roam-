import SwiftUI
import WebKit

@main
struct RoamApp: App {
    var body: some Scene {
        WindowGroup {
            RoamView()
                .ignoresSafeArea(edges: .bottom)
        }
    }
}

struct RoamView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.allowsBackForwardNavigationGestures = true
        view.scrollView.contentInsetAdjustmentBehavior = .automatic
        view.isOpaque = false
        view.backgroundColor = UIColor(red: 0.95, green: 0.97, blue: 1, alpha: 1)
        if let url = URL(string: "https://15641288268.github.io/Roam-/") {
            view.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
        }
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            let host = url.host?.lowercased() ?? ""
            if ["15641288268.github.io"].contains(host) || url.scheme == "about" || url.scheme == "blob" {
                decisionHandler(.allow)
            } else if navigationAction.navigationType == .linkActivated,
                      ["https", "http", "maps", "comgooglemaps"].contains(url.scheme ?? "") {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            } else {
                decisionHandler(.allow)
            }
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url {
                UIApplication.shared.open(url)
            }
            return nil
        }
    }
}
