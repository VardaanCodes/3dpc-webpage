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
import ReactSelect from "react-select";

const submitPrintSchema = z.object({
  clubId: z.number().optional(),
  projectName: z.string().min(1, "Project name is required"),
  eventDeadline: z.string().optional(),
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
  // Query for all clubs (always enabled)
  const { data: allClubs = [] } = useQuery<Club[]>({
    queryKey: ["/api/clubs"],
  });

  // Query for filtered clubs when searching
  const { data: filteredClubs = [] } = useQuery<Club[]>({
    queryKey: ["/api/clubs/search", clubSearch],
    enabled: clubSearch.length > 0,
  });
  const submitMutation = useMutation({
    mutationFn: async (
      data: Omit<SubmitPrintForm, "eventDeadline"> & {
        eventDeadline?: string; // Accept string in YYYY-MM-DD format
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
    // Convert eventDeadline to YYYY-MM-DD if present
    let eventDeadline: string | undefined = undefined;
    if (data.eventDeadline) {
      const d = new Date(data.eventDeadline);
      if (!isNaN(d.getTime())) {
        eventDeadline = d.toISOString().slice(0, 10); // YYYY-MM-DD
      }
    }

    // Get only successfully uploaded files
    const uploadedFiles = files
      .filter(
        (file) => file.uploadStatus === "completed" && file.uploadedFileId
      )
      .map((file) => ({
        id: file.uploadedFileId,
        fileName: file.name,
        size: file.size,
        contentType: file.type,
      }));

    if (files.length > 0 && uploadedFiles.length === 0) {
      toast({
        title: "File upload incomplete",
        description: "Please wait for all files to upload before submitting.",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate({
      ...data,
      files: uploadedFiles,
      eventDeadline,
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
                {" "}
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
                        <div className="bg-slate-900 rounded-md border border-slate-600">
                          <ReactSelect
                            placeholder="Search for a club..."
                            options={allClubs.map((club) => ({
                              value: club.id,
                              label: club.name,
                            }))}
                            onInputChange={(inputValue) => {
                              setClubSearch(inputValue);
                            }}
                            onChange={(selectedOption) => {
                              field.onChange(selectedOption?.value);
                            }}
                            value={
                              field.value
                                ? allClubs
                                    .filter((club) => club.id === field.value)
                                    .map((club) => ({
                                      value: club.id,
                                      label: club.name,
                                    }))[0]
                                : null
                            }
                            classNames={{
                              control: () =>
                                "bg-slate-900 border-slate-600 text-gray-100 min-h-10",
                              menu: () =>
                                "bg-slate-800 border border-slate-600",
                              option: ({ isFocused, isSelected }) =>
                                `${isFocused ? "bg-slate-700" : ""} ${
                                  isSelected ? "bg-slate-600 text-white" : ""
                                } text-gray-100`,
                              placeholder: () => "text-gray-400",
                              input: () => "text-gray-100",
                              singleValue: () => "text-white",
                            }}
                            styles={{
                              control: (base) => ({
                                ...base,
                                backgroundColor: "#0f172a",
                                borderColor: "#334155",
                                color: "#f1f5f9",
                              }),
                              menu: (base) => ({
                                ...base,
                                backgroundColor: "#1e293b",
                                borderColor: "#334155",
                              }),
                              option: (base, state) => ({
                                ...base,
                                backgroundColor: state.isSelected
                                  ? "#334155"
                                  : state.isFocused
                                  ? "#475569"
                                  : "#1e293b",
                                color: state.isSelected ? "#ffffff" : "#f1f5f9",
                              }),
                              input: (base) => ({ ...base, color: "#ffffff" }),
                              singleValue: (base) => ({
                                ...base,
                                color: "#ffffff",
                              }),
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Select your club or team from the dropdown. If you can't
                        find your club, please contact us from the contact page.
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
