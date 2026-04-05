// Import Firebase SDKs (sử dụng module từ CDN để web tĩnh chạy ngon lành)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Thông số cấu hình từ bạn gửi
const firebaseConfig = {
  apiKey: "AIzaSyCDqFJU6jPgtDAM2fYd6HwlREqD73NCYtg",
  authDomain: "nhat-ky-tinh-yeu-c5bf0.firebaseapp.com",
  projectId: "nhat-ky-tinh-yeu-c5bf0",
  storageBucket: "nhat-ky-tinh-yeu-c5bf0.firebasestorage.app",
  messagingSenderId: "1009938408144",
  appId: "1:1009938408144:web:538802d6d5c6e779a3b4d5",
  measurementId: "G-XV88LC6BH1"
};

// Khởi tạo Firebase và Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Reference tới bảng "checkins" trong DB
const checkinsRef = collection(db, "checkins");

document.addEventListener('DOMContentLoaded', () => {
    // --- Tính toán ngày ---
    // Khởi tạo ngày bắt đầu: 22/03/2026
    const startDate = new Date('2026-03-22T00:00:00');
    
    function updateCounter() {
        const now = new Date();
        const diffTime = Math.abs(now - startDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
        
        // Hiệu ứng số chạy từ 0 đến diffDays
        let currentCount = 0;
        const countElement = document.getElementById('days-count');
        
        // Nếu chênh lệch ít hơn 1 ngày (mới bắt đầu) thì hiển thị 0 ngày hoặc 1 ngày tùy logic
        if (diffDays === 0) {
            countElement.textContent = 'Ngày 1';
        } else {
            const increment = Math.max(1, Math.floor(diffDays / 40)); 
            const timer = setInterval(() => {
                currentCount += increment;
                if (currentCount >= diffDays) {
                    countElement.textContent = diffDays;
                    clearInterval(timer);
                } else {
                    countElement.textContent = currentCount;
                }
            }, 30);
        }

        // Cập nhật Progress Bar (demo vui: đạt mốc 100 ngày)
        const progressBar = document.getElementById('progress-bar');
        const progressStatus = document.getElementById('progress-status');
        
        const nextMilestone = 100;
        let percentage = (diffDays / nextMilestone) * 100;
        if (percentage > 100) percentage = 100;
        
        progressBar.style.width = percentage + '%';
        if (diffDays < 30) {
            progressStatus.textContent = 'Trăng mật ngọt ngào...';
        } else if (diffDays < 100) {
            progressStatus.textContent = 'Ngày càng gắn kết...';
        } else {
            progressStatus.textContent = 'Tình yêu bền vững...';
        }
    }

    updateCounter();

    // --- Xử lý Đánh giá sao (Rating) ---
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('rating-value');
    const ratingDesc = document.getElementById('rating-desc');
    const descText = [
        'Chọn điểm đánh giá nhé!',
        'Có chút giận hờn 😢',
        'Bình thường thui 😐',
        'Cũng vui vẻ nè 🙂',
        'Rất là vui luôn 🥰',
        'Tuyệt vời quá trời 💖'
    ];

    let currentRating = 0;

    stars.forEach((star, index) => {
        // Hover
        star.addEventListener('mouseover', () => {
            highlightStars(index + 1);
        });

        // Mouse out
        star.addEventListener('mouseout', () => {
            highlightStars(currentRating);
        });

        // Click
        star.addEventListener('click', () => {
            currentRating = index + 1;
            ratingInput.value = currentRating;
            ratingDesc.textContent = descText[currentRating];
            star.classList.add('jump');
            setTimeout(() => star.classList.remove('jump'), 300);
        });
    });

    function highlightStars(count) {
        stars.forEach((s, i) => {
            if (i < count) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });
    }

    // --- Quản lý Dữ liệu Firebase (Realtime Timeline) ---
    const form = document.getElementById('checkin-form');
    const timeline = document.getElementById('timeline');

    function addTimelineItem(item) {
        const div = document.createElement('div');
        div.className = 'timeline-item';
        
        let starsHtml = '';
        for (let i = 0; i < 5; i++) {
            if (i < item.rating) {
                starsHtml += '<i class="fa-solid fa-star"></i>';
            } else {
                starsHtml += '<i class="fa-regular fa-star" style="color: #dcdde1"></i>';
            }
        }

        const fallbackDicebear = item.user === 'Nga Phạm' 
            ? "https://api.dicebear.com/7.x/micah/svg?seed=NgaPham&backgroundColor=fcd3e1" 
            : "https://api.dicebear.com/7.x/micah/svg?seed=AnTran&backgroundColor=fbd4e7";
        const avatarSrc = item.user === 'Nga Phạm' ? "nga.jpg" : "an.jpg";
        const icon = `<img src="${avatarSrc}" onerror="this.src='${fallbackDicebear}'" class="timeline-avatar" alt="Avatar">`;

        div.innerHTML = `
            <div class="item-header">
                <div class="item-author">${icon} ${item.user}</div>
                <div class="item-date">${item.date}</div>
            </div>
            <div class="item-rating">${starsHtml}</div>
            <div class="item-message">${item.message.replace(/\n/g, '<br>')}</div>
        `;
        
        return div;
    }

    // Lắng nghe dữ liệu thời gian thực từ Firestore
    const q = query(checkinsRef, orderBy('createdAt', 'desc'));
    onSnapshot(q, (snapshot) => {
        timeline.innerHTML = ''; // Reset
        
        if (snapshot.empty) {
            timeline.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-face-grin-hearts"></i>
                    <p>Chưa có ghi chú nào. Hãy là người đầu tiên viết nhé!</p>
                </div>
            `;
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const itemElement = addTimelineItem(data);
            timeline.appendChild(itemElement);
        });
    }, (error) => {
        console.error("Lỗi khi tải dữ liệu Firebase:", error);
    });

    // Handle Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const user = document.querySelector('input[name="user"]:checked').value;
        const rating = parseInt(ratingInput.value);
        const message = document.getElementById('message').value;

        if (rating === 0) {
            alert('Bạn ráng chấm điểm sao (1-5) nhé!');
            return;
        }

        if (!message.trim()) {
            alert('Đừng quên để lại vài lời nhắn nhủ nha!');
            return;
        }

        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';

        const now = new Date();
        const dateStr = now.toLocaleDateString('vi-VN', { 
            hour: '2-digit', minute: '2-digit', 
            day: '2-digit', month: '2-digit', year: 'numeric' 
        });

        const newItem = {
            user: user,
            rating: rating,
            message: message,
            date: dateStr
        };

        try {
            await addDoc(checkinsRef, {
                ...newItem,
                createdAt: serverTimestamp() // Lưu thời gian trên máy chủ
            });
            
            form.reset();
            currentRating = 0;
            highlightStars(0);
            ratingInput.value = 0;
            ratingDesc.textContent = descText[0];
            timeline.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        } catch (error) {
            console.error("Lỗi khi gửi nhật ký:", error);
            alert("Rất tiếc! Đã có lỗi xảy ra khi lưu nhật ký. Hãy kiểm tra cài đặt Database.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi Nhật Ký';
        }
    });
});
