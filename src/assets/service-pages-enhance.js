(function () {
  var targets = {
    "/dang-nhap-sunwin/": {
      title: "Đăng nhập Sunwin",
      desc: "Hướng dẫn truy cập tài khoản Sunwin nhanh, an toàn và ổn định để người chơi tiếp tục trải nghiệm trên đúng hệ thống chính thức.",
      badges: ["Truy cập chính hãng", "Bảo mật ổn định", "Hướng dẫn rõ ràng"]
    },
    "/nap-tien-sunwin/": {
      title: "Nạp tiền Sunwin",
      desc: "Tổng hợp quy trình nạp tiền Sunwin minh bạch, dễ thao tác và phù hợp với nhiều phương thức giao dịch phổ biến hiện nay.",
      badges: ["Nhiều phương thức", "Xử lý minh bạch", "Thao tác đơn giản"]
    },
    "/rut-tien-sunwin/": {
      title: "Rút tiền Sunwin",
      desc: "Cập nhật cách rút tiền Sunwin an toàn, tối ưu thời gian xử lý và giúp người chơi theo dõi giao dịch một cách rõ ràng hơn.",
      badges: ["Tốc độ rõ ràng", "Bảo mật giao dịch", "Điều kiện dễ theo dõi"]
    },
    "/tai-app-sunwin/": {
      title: "Tải app Sunwin",
      desc: "Hướng dẫn tải và cài đặt app Sunwin cho iPhone, Android và APK theo đúng nguồn chính thức để bảo đảm an toàn khi sử dụng.",
      badges: ["Nguồn tải chính thức", "Tương thích đa nền tảng", "Cài đặt dễ hiểu"]
    },
    "/khuyen-mai-sunwin/": {
      title: "Khuyến mãi Sunwin",
      desc: "Tổng hợp ưu đãi Sunwin mới nhất, điều kiện nhận thưởng và cách tận dụng khuyến mãi hiệu quả hơn theo từng giai đoạn.",
      badges: ["Ưu đãi cập nhật", "Điều kiện minh bạch", "Tối ưu giá trị thưởng"]
    }
  };

  var pathname = (window.location.pathname || "/").toLowerCase();
  if (!targets[pathname]) return;

  document.body.classList.add("sun-service-page");

  var info = targets[pathname];
  var h1 = document.querySelector("h1");
  var titleText = (h1 && h1.textContent || info.title).trim();
  var metaDesc = document.querySelector('meta[name="description"]');
  var descText = (metaDesc && metaDesc.getAttribute("content") || info.desc || "").trim();

  var hero = document.createElement("section");
  hero.className = "sw-service-hero";
  hero.innerHTML =
    "<h1>" + titleText + "</h1>" +
    "<p>" + descText + "</p>" +
    "<div class=\"sw-service-badges\">" +
      (info.badges || ["Nội dung chọn lọc", "Điều hướng rõ ràng", "Trải nghiệm đồng bộ"]).map(function (badge) {
        return "<span>" + badge + "</span>";
      }).join("") +
    "</div>";

  var main = document.querySelector("main") || document.querySelector("#main") || document.body;
  if (main && !main.querySelector(".sw-service-hero")) {
    main.insertBefore(hero, main.firstChild);
  }

  var actions = document.createElement("section");
  actions.className = "sw-service-actions";
  actions.innerHTML =
    "<div class=\"sw-service-actions-grid\">" +
      "<a href=\"/dang-ky-sunwin/\"><strong>Đăng ký Sunwin</strong><span>Tạo tài khoản mới nhanh gọn</span></a>" +
      "<a href=\"/dang-nhap-sunwin/\"><strong>Đăng nhập Sunwin</strong><span>Truy cập hệ thống an toàn</span></a>" +
      "<a href=\"/nap-tien-sunwin/\"><strong>Nạp tiền Sunwin</strong><span>Giao dịch qua nhiều phương thức</span></a>" +
      "<a href=\"/rut-tien-sunwin/\"><strong>Rút tiền Sunwin</strong><span>Xử lý rõ ràng và ổn định</span></a>" +
      "<a href=\"/tai-app-sunwin/\"><strong>Tải app Sunwin</strong><span>Cài đặt ứng dụng chính thức</span></a>" +
      "<a href=\"/khuyen-mai-sunwin/\"><strong>Khuyến mãi Sunwin</strong><span>Theo dõi ưu đãi mới nhất</span></a>" +
    "</div>";

  if (main && !main.querySelector(".sw-service-actions")) {
    main.appendChild(actions);
  }
})();
