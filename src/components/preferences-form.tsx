"use client";

import type { FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";

const preferencesSchema = z.object({
  dietaryNeeds: z.string().optional(),
  preferences: z.string().optional(),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

interface PreferencesFormProps {
  onSubmitPreferences: (data: PreferencesFormData) => void;
  defaultValues?: PreferencesFormData;
  // Translation props
  title: string;
  description: string;
  dietaryNeedsLabel: string;
  dietaryNeedsPlaceholder: string;
  preferencesLabel: string;
  preferencesPlaceholder: string;
  submitButtonLabel: string;
}

export const PreferencesForm: FC<PreferencesFormProps> = ({
    onSubmitPreferences,
    defaultValues,
    title,
    description,
    dietaryNeedsLabel,
    dietaryNeedsPlaceholder,
    preferencesLabel,
    preferencesPlaceholder,
    submitButtonLabel
 }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: defaultValues || { dietaryNeeds: "", preferences: "" }
  });

  const onSubmit = (data: PreferencesFormData) => {
    onSubmitPreferences(data);
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-md mb-8">
      <CardHeader>
         <CardTitle>{title}</CardTitle>
         <CardDescription>{description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div>
             <Label htmlFor="dietaryNeeds" className="block text-sm font-medium mb-1">{dietaryNeedsLabel}</Label>
            <Input
              id="dietaryNeeds"
              placeholder={dietaryNeedsPlaceholder}
              {...register("dietaryNeeds")}
              className="w-full"
            />
            {errors.dietaryNeeds && <p className="text-destructive text-xs mt-1">{errors.dietaryNeeds.message}</p>}
          </div>

          <div>
             <Label htmlFor="preferences" className="block text-sm font-medium mb-1">{preferencesLabel}</Label>
            <Textarea
              id="preferences"
              placeholder={preferencesPlaceholder}
              {...register("preferences")}
              className="w-full min-h-[60px]"
            />
            {errors.preferences && <p className="text-destructive text-xs mt-1">{errors.preferences.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
           <Button type="submit" disabled={!isDirty} className="bg-accent text-accent-foreground hover:bg-accent/90">
             {submitButtonLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
