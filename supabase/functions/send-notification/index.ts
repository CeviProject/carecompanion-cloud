
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simulated email sending function
// In a real implementation, you would use a service like Resend, SendGrid, etc.
async function sendEmail(to: string, subject: string, message: string) {
  console.log(`[SIMULATED EMAIL] To: ${to}, Subject: ${subject}, Message: ${message}`);
  
  // Simulated success response
  return {
    id: `sim_${Date.now()}`,
    status: 'sent'
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Send notification function started');
    
    const { type, recipient, subject, message, data } = await req.json();
    
    if (!type || !recipient || !message) {
      throw new Error('Missing required parameters: type, recipient, message');
    }
    
    let result;
    
    // Handle different notification types
    switch (type) {
      case 'email':
        if (!subject) {
          throw new Error('Subject is required for email notifications');
        }
        
        result = await sendEmail(recipient, subject, message);
        break;
        
      case 'appointment_reminder':
        // Special case for appointment reminders
        const { appointmentDate, doctorName } = data || {};
        if (!appointmentDate || !doctorName) {
          throw new Error('appointmentDate and doctorName are required for appointment reminders');
        }
        
        const reminderSubject = subject || 'Upcoming Appointment Reminder';
        const reminderMessage = `
          Hello,
          
          This is a reminder that you have an appointment with Dr. ${doctorName} on ${appointmentDate}.
          
          ${message}
          
          Thank you,
          HealthHub Team
        `;
        
        result = await sendEmail(recipient, reminderSubject, reminderMessage);
        break;
        
      case 'medication_reminder':
        // Special case for medication reminders
        const { medicationName, dosage, time } = data || {};
        if (!medicationName || !dosage || !time) {
          throw new Error('medicationName, dosage, and time are required for medication reminders');
        }
        
        const medReminderSubject = 'Medication Reminder';
        const medReminderMessage = `
          Hello,
          
          This is a reminder to take ${medicationName} (${dosage}) at ${time}.
          
          ${message}
          
          Thank you,
          HealthHub Team
        `;
        
        result = await sendEmail(recipient, medReminderSubject, medReminderMessage);
        break;
        
      case 'health_tip':
        // Special case for health tip notifications
        const { tipTitle, tipContent } = data || {};
        if (!tipTitle) {
          throw new Error('tipTitle is required for health tip notifications');
        }
        
        const tipSubject = 'New Health Tip Available';
        const tipMessage = `
          Hello,
          
          ${message}
          
          ${tipTitle}
          
          ${tipContent || ''}
          
          Thank you,
          HealthHub Team
        `;
        
        result = await sendEmail(recipient, tipSubject, tipMessage);
        break;
        
      default:
        throw new Error(`Unsupported notification type: ${type}`);
    }
    
    console.log(`Notification sent successfully: ${type}`);
    
    return new Response(JSON.stringify({ 
      success: true,
      result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-notification function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
