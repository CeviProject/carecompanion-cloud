
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-16">
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-8">About VirtualHealth</h1>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-lg text-muted-foreground mb-6">
                  VirtualHealth is a comprehensive platform designed to bridge the gap between elderly patients 
                  and healthcare providers, offering seamless medical management and communication.
                </p>
                
                <h2 className="text-2xl font-semibold mt-10 mb-4">Our Mission</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Our mission is to empower elderly patients with the tools and resources they need to take 
                  control of their health journey while providing healthcare professionals with efficient ways 
                  to deliver personalized care.
                </p>
                
                <h2 className="text-2xl font-semibold mt-10 mb-4">How We Help</h2>
                <ul className="space-y-4 mb-8 list-disc pl-6">
                  <li className="text-lg text-muted-foreground">
                    <strong>Simplified Healthcare Management:</strong> We make it easy for elderly patients to 
                    manage medications, appointments, and health information in one place.
                  </li>
                  <li className="text-lg text-muted-foreground">
                    <strong>AI-Powered Health Assessment:</strong> Our intelligent system helps identify potential 
                    health concerns and connects patients with appropriate specialists.
                  </li>
                  <li className="text-lg text-muted-foreground">
                    <strong>Direct Provider Communication:</strong> We facilitate seamless communication between 
                    patients and their healthcare providers, ensuring continuity of care.
                  </li>
                </ul>
                
                <h2 className="text-2xl font-semibold mt-10 mb-4">Our Commitment</h2>
                <p className="text-lg text-muted-foreground">
                  We're committed to creating a healthcare experience that respects the dignity and independence 
                  of elderly patients while leveraging technology to improve health outcomes. Our platform is designed 
                  with accessibility and ease of use as core principles, ensuring that technology enhances rather 
                  than complicates the healthcare journey.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
