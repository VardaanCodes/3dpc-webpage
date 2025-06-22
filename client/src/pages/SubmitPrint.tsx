/** @format */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Club } from "@shared/schema";
import { Layers, Users, User, Calendar, Palette, FileText } from "lucide-react";

const submitPrintSchema = z.object({
  clubId: z.number().optional(),
  projectName: z.string().min(1, "Project name is required"),
  eventDeadline: z.date().optional(),
  material: z.string().default("PLA"),
  color: z.string().default("White"),
  providingFilament: z.boolean().default(false),
  specialInstructions: z.string().optional(),
});

type SubmitPrintForm = z.infer<typeof submitPrintSchema>;

export function SubmitPrint() {
  const [files, setFiles] = useState<any[]>([]);
  const [clubSearch, setClubSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SubmitPrintForm>({
    resolver: zodResolver(submitPrintSchema),
    defaultValues: {
      material: "PLA",
      color: "White",
      providingFilament: false,
    },
  });

  const { data: clubs = [] } = useQuery<Club[]>({
    queryKey: ["/api/clubs/search", clubSearch],
    enabled: clubSearch.length > 0,
  });
  const submitMutation = useMutation({
    mutationFn: async (
      data: Omit<SubmitPrintForm, "eventDeadline"> & {
        eventDeadline?: Date;
        files: any[];
      }
    ) => {
      const response = await apiRequest("POST", "/api/orders", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Print request submitted!",
        description:
          "Your print request has been submitted and is awaiting approval.",
      });
      form.reset();
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const onSubmit = (data: SubmitPrintForm) => {
    submitMutation.mutate({
      ...data,
      files,
      eventDeadline: data.eventDeadline
        ? new Date(data.eventDeadline)
        : undefined,
    });
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          Submit a Print Request
        </h2>
        <p className="text-gray-400">
          Fill out the form below to submit your 3D printing request to the
          queue.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Print Submission Form */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Print Request Details</CardTitle>
            <CardDescription>
              Provide information about your print request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Club/Team Selection */}
                <FormField
                  control={form.control}
                  name="clubId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        Club/Team Name
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Start typing to search clubs..."
                            value={clubSearch}
                            onChange={(e) => setClubSearch(e.target.value)}
                            className="bg-slate-900 border-slate-600 text-white placeholder-gray-400"
                          />
                          {clubs.length > 0 && clubSearch && (
                            <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg">
                              {clubs.map((club) => (
                                <button
                                  key={club.id}
                                  type="button"
                                  className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 transition-colors"
                                  onClick={() => {
                                    field.onChange(club.id);
                                    setClubSearch(club.name);
                                  }}
                                >
                                  {club.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        If your club isn't listed, continue typing to add a new
                        one
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Project/Event Name */}
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 flex items-center">
                        <FileText className="mr-2 h-4 w-4" />
                        Project/Event Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Robotics Competition Parts"
                          {...field}
                          className="bg-slate-900 border-slate-600 text-white placeholder-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Event Deadline */}
                <FormField
                  control={form.control}
                  name="eventDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        Event Deadline
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="bg-slate-900 border-slate-600 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Material and Color */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">
                          Material
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PLA">PLA (Default)</SelectItem>
                            <SelectItem value="ABS">ABS</SelectItem>
                            <SelectItem value="PETG">PETG</SelectItem>
                            <SelectItem value="TPU">TPU</SelectItem>
                            <SelectItem value="Custom">
                              Custom (Provide own)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Color</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="White">
                              White (Default)
                            </SelectItem>
                            <SelectItem value="Black">Black</SelectItem>
                            <SelectItem value="Red">Red</SelectItem>
                            <SelectItem value="Blue">Blue</SelectItem>
                            <SelectItem value="Custom">
                              Custom (Provide own)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Filament Provision */}
                <FormField
                  control={form.control}
                  name="providingFilament"
                  render={({ field }) => (
                    <FormItem className="bg-slate-900 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-start space-x-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-1"
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="text-gray-300 font-medium">
                            I will provide my own filament
                          </FormLabel>
                          <FormDescription>
                            Required for non-default material/color
                            combinations. Must be delivered before printing
                            begins.
                          </FormDescription>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Special Instructions */}
                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">
                        Special Instructions
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requirements, infill percentage, support structures, etc."
                          {...field}
                          className="bg-slate-900 border-slate-600 text-white placeholder-gray-400 resize-none"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                  disabled={submitMutation.isPending}
                >
                  <Layers className="mr-2 h-4 w-4" />
                  {submitMutation.isPending
                    ? "Submitting..."
                    : "Submit Print Request"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <div className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Upload Files</CardTitle>
              <CardDescription>
                Upload your 3D model files for printing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload onFilesChange={setFiles} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
