// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    
    const countdownElement = document.getElementById('countdown');
    
    // Verifica se o elemento countdown existe na página antes de tentar usá-lo
    if (countdownElement) {
        function initializeCountdown() {
            const now = new Date();
            
            let expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Expirar em 24h
            
            // Simulação de expiração a cada 24 horas para fins de demonstração
            const offset = expiry.getTime() % (24 * 60 * 60 * 1000);  
            expiry.setTime(expiry.getTime() - offset);
            expiry = new Date(expiry.getTime() + 24 * 60 * 60 * 1000);

            const updateCountdown = () => {
                const now = new Date().getTime();
                const distance = expiry.getTime() - now;

                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                if (distance < 0) {
                    clearInterval(interval);
                    countdownElement.innerHTML = `<span class="text-2xl">OFERTA EXPIRADA</span>`;
                } else {
                    countdownElement.innerHTML = `
                        <div class="flex flex-col items-center"><span>${String(hours).padStart(2, '0')}</span><span class="text-base font-normal uppercase">Horas</span></div>
                        :
                        <div class="flex flex-col items-center"><span>${String(minutes).padStart(2, '0')}</span><span class="text-base font-normal uppercase">Minutos</span></div>
                        :
                        <div class="flex flex-col items-center"><span>${String(seconds).padStart(2, '0')}</span><span class="text-base font-normal uppercase">Segundos</span></div>
                    `;
                }
            };

            updateCountdown();
            const interval = setInterval(updateCountdown, 1000);
        }
        
        initializeCountdown();
    }

    // Lógica para mostrar/esconder o CTA de rodapé na rolagem (mantida)
    const fixedFooter = document.getElementById('fixed-cta-footer');
    const heroSection = document.querySelector('header');

    const toggleFixedCTAs = () => {
        const scrollPosition = window.scrollY;
        // Assegura que heroSection existe antes de ler offsetHeight
        const headerHeight = heroSection ? heroSection.offsetHeight : 500; 

        if (scrollPosition > headerHeight * 0.8 && window.innerHeight + window.scrollY < document.body.offsetHeight - 50) {
            fixedFooter.classList.remove('hidden');
        } else {
            fixedFooter.classList.add('hidden');
        }
    };

    window.addEventListener('scroll', toggleFixedCTAs);
    toggleFixedCTAs(); // Roda na inicialização
});