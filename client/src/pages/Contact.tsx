/** @format */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Mail, MapPin, Clock, HelpCircle, Layers, Phone } from "lucide-react";

const contactSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  orderId: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof contactSchema>;

export function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      subject: "",
      orderId: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactForm) => {
    setIsSubmitting(true);
    try {
      // Simulate form submission
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
      });

      form.reset();
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please try again later or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqItems = [
    {
      question: "How long does printing take?",
      answer:
        "Processing times vary from 1-7 days depending on complexity and queue length. Check the Guidelines page for detailed estimates.",
    },
    {
      question: "Can I use my own filament?",
      answer:
        "Yes! Check the 'provide own filament' option when submitting your request. You'll need to deliver it before printing begins.",
    },
    {
      question: "What if my print fails?",
      answer:
        "We'll notify you with suggestions for improvement and allow resubmission. Common issues include overhangs, thin walls, or unsupported features.",
    },
    {
      question: "Can I cancel my print request?",
      answer:
        "Yes, you can request cancellation through this contact form. Include your order ID for faster processing.",
    },
    {
      question: "How do I know when my print is ready?",
      answer:
        "You'll receive email notifications at each stage: approval, start, completion, or if issues arise.",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          Contact & Support
        </h2>
        <p className="text-gray-400">
          Get help with your 3D printing requests and technical issues.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Mail className="mr-2 h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>
                Multiple ways to reach our 3D printing team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="text-cyan-500 h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Email Support
                    </p>
                    <p className="text-sm text-gray-400">3dpc@college.edu</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="text-cyan-500 h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium text-white">Location</p>
                    <p className="text-sm text-gray-400">
                      Engineering Building, Room 101
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="text-cyan-500 h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Operating Hours
                    </p>
                    <p className="text-sm text-gray-400">Mon-Fri: 9AM-5PM</p>
                    <p className="text-xs text-gray-500">
                      Closed weekends and holidays
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="text-cyan-500 h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Emergency Contact
                    </p>
                    <p className="text-sm text-gray-400">(555) 123-4567</p>
                    <p className="text-xs text-gray-500">
                      For urgent print failures only
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <HelpCircle className="mr-2 h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Quick answers to common questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <div
                    key={index}
                    className="border-b border-slate-700 last:border-b-0 pb-4 last:pb-0"
                  >
                    <h4 className="font-medium text-white text-sm mb-2">
                      {item.question}
                    </h4>
                    <p className="text-sm text-gray-400">{item.answer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Support Form */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Layers className="mr-2 h-5 w-5" />
              Get Support
            </CardTitle>
            <CardDescription>
              Send us a message and we'll respond within 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
                netlify
              >
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Subject</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">
                            General Question
                          </SelectItem>
                          <SelectItem value="print-quality">
                            Print Quality Issue
                          </SelectItem>
                          <SelectItem value="file-upload">
                            File Upload Problem
                          </SelectItem>
                          <SelectItem value="account">
                            Account Access
                          </SelectItem>
                          <SelectItem value="cancellation">
                            Cancel Print Request
                          </SelectItem>
                          <SelectItem value="rush">
                            Rush Order Request
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">
                        Order ID (if applicable)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., #RC24001"
                          {...field}
                          className="bg-slate-900 border-slate-600 text-white placeholder-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your issue or question in detail..."
                          {...field}
                          className="bg-slate-900 border-slate-600 text-white placeholder-gray-400 resize-none min-h-[120px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                  disabled={isSubmitting}
                >
                  <Layers className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
              <h4 className="text-sm font-medium text-white mb-2">
                Response Time
              </h4>
              <p className="text-xs text-gray-400">
                We typically respond to support requests within 24 hours during
                business days. For urgent issues during operating hours,
                consider visiting our location directly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
